from django.contrib import admin
from .models import Profile, Goal, Task, TaskRecommendation, Agent, TaskAssignment, Transaction, AgentRating


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'full_name', 'country', 'credit_balance', 'is_activated', 'created_at')
    list_filter = ('role', 'is_activated', 'preferred_delivery')
    search_fields = ('user__username', 'user__email', 'full_name', 'phone_number')


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'short_input', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('raw_input', 'user__username')

    def short_input(self, obj):
        return obj.raw_input[:50]
    short_input.short_description = 'Goal Input'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'goal', 'task_type', 'domain', 'status', 'created_at')
    list_filter = ('status', 'domain', 'task_type')
    search_fields = ('task_type', 'goal__raw_input')


@admin.register(TaskRecommendation)
class TaskRecommendationAdmin(admin.ModelAdmin):
    list_display = ('task', 'agent', 'rank', 'reason')
    list_filter = ('rank',)
    search_fields = ('agent__name', 'task__task_type')


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('name', 'agent_type', 'domain', 'status', 'trust_score',
                    'rating', 'success_rate', 'jobs_completed', 'base_price_per_task')
    list_filter = ('status', 'agent_type', 'domain')
    search_fields = ('name', 'owner_full_name', 'owner_email', 'domain')
    actions = ['approve_agents', 'suspend_agents', 'deactivate_agents']

    fieldsets = (
        ('Identity (Step 1)', {
            'fields': ('name', 'creator', 'owner_full_name', 'owner_email', 'country',
                       'agent_type', 'short_description', 'long_description')
        }),
        ('Technical Setup (Step 2)', {
            'fields': ('api_endpoint', 'auth_method', 'auth_secret',
                       'supported_input_formats', 'supported_output_formats',
                       'avg_completion_time', 'max_concurrent_tasks')
        }),
        ('Payment (Step 3)', {
            'fields': ('wallet_address', 'payout_frequency', 'min_payout_threshold')
        }),
        ('Pricing (Step 4)', {
            'fields': ('base_price_per_task', 'per_page_price', 'per_minute_price',
                       'surge_pricing_enabled')
        }),
        ('Platform & Scoring', {
            'fields': ('domain', 'retrieval_depth', 'status', 'trust_score',
                       'rating', 'success_rate', 'jobs_completed')
        }),
        ('Vetting', {
            'fields': ('vetting_test_passed', 'vetting_test_result', 'rejection_reason')
        }),
    )

    @admin.action(description='Approve selected agents')
    def approve_agents(self, request, queryset):
        queryset.update(status='active')

    @admin.action(description='Suspend selected agents')
    def suspend_agents(self, request, queryset):
        queryset.update(status='suspended')

    @admin.action(description='Deactivate selected agents')
    def deactivate_agents(self, request, queryset):
        queryset.update(status='deactivated')


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'agent', 'status', 'assigned_at', 'completed_at')
    list_filter = ('status',)
    search_fields = ('task__task_type', 'agent__name')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'assignment', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'currency')
    search_fields = ('user__username',)


@admin.register(AgentRating)
class AgentRatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'agent', 'score', 'created_at')
    list_filter = ('score',)
    search_fields = ('user__username', 'agent__name')
