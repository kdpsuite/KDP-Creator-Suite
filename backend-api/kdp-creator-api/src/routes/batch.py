from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User, BatchJob, db
from datetime import datetime
import threading

batch_bp = Blueprint('batch', __name__)


@batch_bp.route('/batch/jobs', methods=['GET'])
@jwt_required()
def get_batch_jobs():
    user_id = get_jwt_identity()
    jobs = BatchJob.query.filter_by(user_id=user_id).order_by(BatchJob.created_at.desc()).limit(50).all()
    return jsonify({'success': True, 'jobs': [j.to_dict() for j in jobs]})


@batch_bp.route('/batch/jobs/<int:job_id>', methods=['GET'])
@jwt_required()
def get_batch_job(job_id):
    user_id = get_jwt_identity()
    job = BatchJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify({'success': True, 'job': job.to_dict()})


@batch_bp.route('/batch/submit', methods=['POST'])
@jwt_required()
def submit_batch_job():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    job_type = data.get('job_type')
    total_files = data.get('total_files', 0)

    if not job_type or total_files < 1:
        return jsonify({'error': 'job_type and total_files (>0) are required'}), 400

    # Check batch limits based on subscription
    from src.routes.subscription import SUBSCRIPTION_TIERS
    tier = SUBSCRIPTION_TIERS.get(user.subscription_tier, SUBSCRIPTION_TIERS['free'])
    batch_limit = tier['batch_processing_limit']
    if batch_limit != -1 and user.batch_operations_this_month >= batch_limit:
        return jsonify({'error': 'Batch processing limit reached for your tier'}), 403

    job = BatchJob(
        user_id=int(user_id),
        job_type=job_type,
        total_files=total_files,
        status='queued'
    )
    db.session.add(job)
    user.batch_operations_this_month += 1
    db.session.commit()

    # Simulate async processing in background thread
    threading.Thread(target=_process_batch_job, args=(job.id,), daemon=True).start()

    return jsonify({'success': True, 'job': job.to_dict()}), 201


@batch_bp.route('/batch/jobs/<int:job_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_batch_job(job_id):
    user_id = get_jwt_identity()
    job = BatchJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    if job.status in ('completed', 'failed'):
        return jsonify({'error': 'Cannot cancel a finished job'}), 400
    job.status = 'failed'
    job.error_message = 'Cancelled by user'
    job.completed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'job': job.to_dict()})


def _process_batch_job(job_id):
    """Simulate batch processing with incremental progress"""
    import time
    from src.main import app
    with app.app_context():
        job = BatchJob.query.get(job_id)
        if not job:
            return
        job.status = 'processing'
        db.session.commit()

        for i in range(1, job.total_files + 1):
            time.sleep(0.5)  # Simulate processing time per file
            job = BatchJob.query.get(job_id)
            if job.status == 'failed':  # cancelled
                return
            job.processed_files = i
            db.session.commit()

        job.status = 'completed'
        job.completed_at = datetime.utcnow()
        db.session.commit()
