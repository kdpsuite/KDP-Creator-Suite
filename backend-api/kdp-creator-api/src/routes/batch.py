from flask import Blueprint, jsonify, request
from src.models.user import supabase, UserProfile, BatchJob, jwt_required, get_jwt_identity
from src.utils.responses import success_response, error_response
from datetime import datetime
import threading

batch_bp = Blueprint('batch', __name__)

@batch_bp.route('/batch/jobs', methods=['GET'])
@jwt_required()
def get_batch_jobs():
    user_id = get_jwt_identity()
    try:
        res = supabase.table('batch_jobs').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
        return success_response({'jobs': [BatchJob.to_dict(j) for j in res.data]})
    except Exception as e:
        return error_response(f'Failed to fetch batch jobs: {str(e)}', 'DATABASE_ERROR', status_code=500)

@batch_bp.route('/batch/jobs/<job_id>', methods=['GET'])
@jwt_required()
def get_batch_job(job_id):
    user_id = get_jwt_identity()
    try:
        res = supabase.table('batch_jobs').select('*').eq('id', job_id).eq('user_id', user_id).single().execute()
        if not res.data:
            return error_response('Job not found', 'JOB_NOT_FOUND', status_code=404)
        return success_response({'job': BatchJob.to_dict(res.data)})
    except Exception as e:
        return error_response(f'Failed to fetch job details: {str(e)}', 'DATABASE_ERROR', status_code=500)

@batch_bp.route('/batch/submit', methods=['POST'])
@jwt_required()
def submit_batch_job():
    user_id = get_jwt_identity()
    profile = UserProfile.get_by_id(user_id)
    if not profile:
        return error_response('User not found', 'USER_NOT_FOUND', status_code=404)

    data = request.get_json()
    job_type = data.get('job_type')
    total_files = data.get('total_files', 0)

    if not job_type or total_files < 1:
        return error_response('job_type and total_files (>0) are required', 'INVALID_INPUT', status_code=400)

    # Check batch limits based on subscription
    from src.routes.subscription import SUBSCRIPTION_TIERS
    tier_name = profile.get('subscription_tier', 'free')
    tier = SUBSCRIPTION_TIERS.get(tier_name, SUBSCRIPTION_TIERS['free'])
    batch_limit = tier['batch_processing_limit']
    current_batch_ops = profile.get('batch_operations_this_month', 0)
    
    if batch_limit != -1 and current_batch_ops >= batch_limit:
        return error_response('Batch processing limit reached for your tier', 'LIMIT_REACHED', status_code=403)

    job_data = {
        'user_id': user_id,
        'job_type': job_type,
        'total_files': total_files,
        'status': 'queued'
    }
    try:
        res = supabase.table('batch_jobs').insert(job_data).execute()
        if not res.data:
            return error_response('Failed to create job', 'DATABASE_ERROR', status_code=500)
        
        job = res.data[0]
        
        # Increment user batch operations
        supabase.table('user_profiles').update({
            'batch_operations_this_month': current_batch_ops + 1
        }).eq('id', user_id).execute()

        # Simulate async processing
        threading.Thread(target=_process_batch_job, args=(job['id'],), daemon=True).start()

        return success_response({'job': BatchJob.to_dict(job)}, status_code=201)
    except Exception as e:
        return error_response(f'Batch submission failed: {str(e)}', 'BATCH_ERROR', status_code=500)

@batch_bp.route('/batch/jobs/<job_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_batch_job(job_id):
    user_id = get_jwt_identity()
    try:
        res = supabase.table('batch_jobs').select('*').eq('id', job_id).eq('user_id', user_id).single().execute()
        if not res.data:
            return error_response('Job not found', 'JOB_NOT_FOUND', status_code=404)
        
        job = res.data
        if job['status'] in ('completed', 'failed', 'cancelled'):
            return error_response('Cannot cancel a finished job', 'INVALID_STATE', status_code=400)
        
        update_data = {
            'status': 'cancelled',
            'error_message': 'Cancelled by user',
            'completed_at': datetime.utcnow().isoformat() + 'Z'
        }
        res = supabase.table('batch_jobs').update(update_data).eq('id', job_id).execute()
        
        return success_response({'job': BatchJob.to_dict(res.data[0])})
    except Exception as e:
        return error_response(f'Failed to cancel job: {str(e)}', 'DATABASE_ERROR', status_code=500)

def _process_batch_job(job_id):
    """Simulate batch processing with incremental progress"""
    import time
    
    # Update status to processing
    supabase.table('batch_jobs').update({'status': 'processing'}).eq('id', job_id).execute()

    res = supabase.table('batch_jobs').select('total_files').eq('id', job_id).single().execute()
    if not res.data:
        return
    total_files = res.data['total_files']

    for i in range(1, total_files + 1):
        time.sleep(0.5)
        # Check if cancelled
        check_res = supabase.table('batch_jobs').select('status').eq('id', job_id).single().execute()
        if not check_res.data or check_res.data['status'] == 'cancelled':
            return
        
        supabase.table('batch_jobs').update({'processed_files': i}).eq('id', job_id).execute()

    supabase.table('batch_jobs').update({
        'status': 'completed',
        'completed_at': datetime.utcnow().isoformat() + 'Z'
    }).eq('id', job_id).execute()
