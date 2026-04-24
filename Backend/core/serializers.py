from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Goal, Task, Agent, TaskAssignment, Transaction, AgentRating


# ──────────────────────────────────────────────
# AUTH & USER ONBOARDING (Module 2)
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    """Step 1 of user onboarding — basic account creation with role selection."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=['user', 'agent_creator'],
        default='user',
        help_text="'user' for demand side, 'agent_creator' for supply side",
    )
    # Module 2 fields
    full_name = serializers.CharField(max_length=255, required=False, default='')
    phone_number = serializers.CharField(max_length=20, required=False, default='')
    country = serializers.CharField(max_length=100, required=False, default='')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value

    def create(self, validated_data):
        role = validated_data.pop('role', 'user')
        full_name = validated_data.pop('full_name', '')
        phone_number = validated_data.pop('phone_number', '')
        country = validated_data.pop('country', '')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        # Profile is auto-created by signal, update with onboarding data
        user.profile.role = role
        user.profile.full_name = full_name
        user.profile.phone_number = phone_number
        user.profile.country = country
        user.profile.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    country = serializers.CharField(source='profile.country', read_only=True)
    preferred_language = serializers.CharField(source='profile.preferred_language', read_only=True)
    preferred_delivery = serializers.CharField(source='profile.preferred_delivery', read_only=True)
    credit_balance = serializers.DecimalField(source='profile.credit_balance', max_digits=10,
                                              decimal_places=2, read_only=True)
    is_activated = serializers.BooleanField(source='profile.is_activated', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'full_name', 'phone_number',
                  'country', 'preferred_language', 'preferred_delivery',
                  'credit_balance', 'is_activated')


class ProfileUpdateSerializer(serializers.Serializer):
    """For updating user profile settings (Section 4.4)."""
    full_name = serializers.CharField(max_length=255, required=False)
    phone_number = serializers.CharField(max_length=20, required=False)
    country = serializers.CharField(max_length=100, required=False)
    preferred_language = serializers.CharField(max_length=50, required=False)
    preferred_delivery = serializers.ChoiceField(
        choices=['email', 'whatsapp', 'both'], required=False
    )
    notify_low_credits = serializers.BooleanField(required=False)
    notify_task_completion = serializers.BooleanField(required=False)


# ──────────────────────────────────────────────
# AGENT REGISTRATION (Module 1 — 4-Step)
# ──────────────────────────────────────────────

class AgentCreateSerializer(serializers.ModelSerializer):
    """
    Full 4-step agent registration matching PRD Section 3.3–3.6.
    """
    class Meta:
        model = Agent
        fields = (
            'id',
            # Step 1: Identity
            'name', 'owner_full_name', 'owner_email', 'country',
            'agent_type', 'short_description', 'long_description',
            # Step 2: Technical Setup
            'api_endpoint', 'auth_method', 'auth_secret',
            'supported_input_formats', 'supported_output_formats',
            'avg_completion_time', 'max_concurrent_tasks',
            # Step 3: Payment
            'wallet_address', 'payout_frequency', 'min_payout_threshold',
            # Step 4: Pricing
            'base_price_per_task', 'per_page_price', 'per_minute_price',
            'surge_pricing_enabled',
            # Domain / Intelligence
            'domain', 'retrieval_depth',
        )
        read_only_fields = ('id',)

    def validate_short_description(self, value):
        if len(value) > 300:
            raise serializers.ValidationError('Short description must be max 300 characters.')
        return value

    def validate_long_description(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError('Long description must be max 1000 characters.')
        return value


class AgentSerializer(serializers.ModelSerializer):
    """Full agent profile serializer (Section 3.8)."""
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Agent
        fields = (
            'id', 'name', 'agent_type', 'short_description', 'long_description',
            'domain', 'status', 'is_active',
            'trust_score', 'rating', 'success_rate', 'jobs_completed',
            'avg_completion_time', 'max_concurrent_tasks',
            'supported_input_formats', 'supported_output_formats',
            'base_price_per_task', 'per_page_price', 'per_minute_price',
            'surge_pricing_enabled',
            'retrieval_depth', 'country', 'created_at',
        )


class AgentDetailSerializer(serializers.ModelSerializer):
    """Full detail for agent creator's own view (includes payment/technical info)."""
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Agent
        exclude = ('auth_secret',)  # Never expose secrets


# ──────────────────────────────────────────────
# CORE MODELS
# ──────────────────────────────────────────────

class TaskAssignmentSerializer(serializers.ModelSerializer):
    agent = AgentSerializer(read_only=True)
    agent_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = TaskAssignment
        fields = ('id', 'task', 'agent', 'agent_id', 'status', 'output_result',
                  'assigned_at', 'completed_at')
        read_only_fields = ('id', 'assigned_at', 'completed_at', 'output_result', 'status')


class TaskSerializer(serializers.ModelSerializer):
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    recommended_agents = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ('id', 'goal', 'task_type', 'domain', 'description', 'status',
                  'created_at', 'assignments', 'recommended_agents')
        read_only_fields = ('id', 'created_at')

    def get_recommended_agents(self, obj):
        """Return ONLY agents recommended by the orchestrator for this task."""
        recommendations = obj.recommendations.select_related('agent').order_by('rank')
        result = []
        for rec in recommendations:
            agent = rec.agent
            agent_data = AgentSerializer(agent).data
            agent_data['rank'] = rec.rank
            agent_data['recommendation_reason'] = rec.reason
            result.append(agent_data)
        return result


class GoalSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Goal
        fields = ('id', 'user', 'raw_input', 'status', 'created_at', 'updated_at', 'tasks')
        read_only_fields = ('id', 'user', 'status', 'created_at', 'updated_at')


class GoalCreateSerializer(serializers.ModelSerializer):
    """Lightweight serializer for creating a goal (just the raw_input)."""
    class Meta:
        model = Goal
        fields = ('id', 'raw_input')
        read_only_fields = ('id',)


# ──────────────────────────────────────────────
# PAYMENTS & RATINGS
# ──────────────────────────────────────────────

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AgentRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentRating
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')
