from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Auth & User Profile
    path('auth/register/', views.register, name='register'),
    path('auth/me/', views.me, name='me'),
    path('auth/profile/', views.update_profile, name='update-profile'),

    # Goals
    path('goals/', views.GoalListCreateView.as_view(), name='goal-list-create'),
    path('goals/<uuid:pk>/', views.GoalDetailView.as_view(), name='goal-detail'),

    # Tasks
    path('tasks/<uuid:pk>/', views.TaskDetailView.as_view(), name='task-detail'),

    # Agent Marketplace (public profiles)
    path('agents/', views.AgentListView.as_view(), name='agent-list'),

    # Agent Creator (Supply Side)
    path('agents/submit/', views.submit_agent, name='submit-agent'),
    path('agents/mine/', views.my_agents, name='my-agents'),
    path('agents/<uuid:agent_id>/status/', views.update_agent_status, name='update-agent-status'),
    path('withdraw/', views.withdraw_funds, name='withdraw-funds'),
    path('topup/', views.topup_funds, name='topup-funds'),

    # Agent Selection & Execution
    path('select-agent/', views.select_agent, name='select-agent'),
    path('execute/<uuid:assignment_id>/', views.execute_task, name='execute-task'),

    # Payments
    path('transactions/', views.my_transactions, name='my-transactions'),

    # Ratings
    path('rate/', views.rate_agent, name='rate-agent'),

    # TTS Integration
    path('jarvis-tts/', views.jarvis_tts, name='jarvis-tts'),

    # Notifications
    path('notifications/', views.get_notifications, name='get-notifications'),
    path('notifications/<uuid:notif_id>/read/', views.mark_notification_read, name='mark-notification-read'),

    # Admin
    path('admin/stats/', views.admin_stats, name='admin-stats'),
    path('admin/agents/', views.admin_agents, name='admin-agents'),
    path('admin/agents/<uuid:agent_id>/status/', views.admin_update_agent, name='admin-update-agent'),
    path('admin/agents/<uuid:agent_id>/vet/', views.admin_vet_single_agent, name='admin-vet-single-agent'),
    path('admin/agents/run-vetting/', views.admin_run_vetting, name='admin-run-vetting'),
    path('admin/transactions/', views.admin_transactions, name='admin-transactions'),
    path('admin/knowledge/upload/', views.admin_upload_knowledge, name='admin-upload-knowledge'),
]
