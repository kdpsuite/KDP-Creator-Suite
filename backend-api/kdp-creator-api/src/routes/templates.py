from flask import Blueprint, request
from src.data.templates import STARTER_TEMPLATES
from src.utils.responses import success_response

templates_bp = Blueprint('templates', __name__)


@templates_bp.route('/templates', methods=['GET'])
def list_templates():
    niche = request.args.get('niche')
    templates = STARTER_TEMPLATES
    if niche:
        templates = [t for t in templates if t['niche'] == niche]
    return success_response({'templates': templates, 'total': len(templates)})
