from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid


# ──────────────────────────────────────────────
# USER PROFILE (Module 2 — Demand Side)
# ──────────────────────────────────────────────

class Profile(models.Model):
    """Extended user profile — Module 2: User Onboarding & Account Setup."""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('agent_creator', 'Agent Creator'),
        ('admin', 'Admin'),
    ]
    DELIVERY_CHOICES = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('both', 'Both'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, default='user', choices=ROLE_CHOICES)

    # Identity (Section 4.2)
    full_name = models.CharField(max_length=255, blank=True, default='')
    phone_number = models.CharField(max_length=20, blank=True, default='',
                                    help_text='Used for WhatsApp output delivery')
    country = models.CharField(max_length=100, blank=True, default='')

    # Preferences (Section 4.2 / 4.4)
    preferred_language = models.CharField(max_length=50, default='English')
    preferred_delivery = models.CharField(max_length=20, default='email', choices=DELIVERY_CHOICES)
    notify_low_credits = models.BooleanField(default=True)
    notify_task_completion = models.BooleanField(default=True)

    # Credits (Section 4.3)
    credit_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00,
                                         help_text='User credit balance in USD')
    is_activated = models.BooleanField(default=False,
                                       help_text='True after user loads minimum $5 credits')

    bio = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Auto-create a Profile when a new User is created."""
    if created:
        Profile.objects.create(user=instance)


# ──────────────────────────────────────────────
# AGENT (Module 1 — Supply Side)
# ──────────────────────────────────────────────

class Agent(models.Model):
    """
    Full agent model — Module 1: Agent Registration & Onboarding.
    4-step registration: Identity → Technical Setup → Payment → Pricing.
    """
    AGENT_TYPE_CHOICES = [
        ('research', 'Research'),
        ('summarization', 'Summarization'),
        ('translation', 'Translation'),
        ('data_analysis', 'Data Analysis'),
        ('code_generation', 'Code Generation'),
        ('image_processing', 'Image Processing'),
        ('document_drafting', 'Document Drafting'),
        ('web_search', 'Web Search'),
        ('custom', 'Custom'),
    ]
    AUTH_METHOD_CHOICES = [
        ('api_key', 'API Key'),
        ('bearer_token', 'Bearer Token'),
    ]
    PAYOUT_FREQUENCY_CHOICES = [
        ('per_task', 'Per Task'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('busy', 'Busy'),
        ('suspended', 'Suspended'),
        ('deactivated', 'Deactivated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agents', null=True, blank=True,
                                help_text='The developer/company who owns this agent')

    # ── Step 1: Identity (Section 3.3) ──
    name = models.CharField(max_length=255, help_text='Agent display name')
    owner_full_name = models.CharField(max_length=255, blank=True, default='')
    owner_email = models.EmailField(blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    agent_type = models.CharField(max_length=50, choices=AGENT_TYPE_CHOICES, default='custom')
    short_description = models.CharField(max_length=300, blank=True, default='',
                                         help_text='What the agent does (max 300 chars)')
    long_description = models.TextField(blank=True, default='',
                                        help_text='Capabilities, limitations, ideal task types (max 1000 chars)')

    # ── Step 2: Technical Setup (Section 3.4) ──
    api_endpoint = models.URLField(blank=True, default='',
                                   help_text='Where Jarvis sends task payloads')
    auth_method = models.CharField(max_length=20, choices=AUTH_METHOD_CHOICES, default='api_key')
    auth_secret = models.TextField(blank=True, default='',
                                   help_text='API key or Bearer token (stored encrypted in production)')
    supported_input_formats = models.JSONField(default=list, blank=True,
                                               help_text='e.g. ["text", "pdf", "image", "json"]')
    supported_output_formats = models.JSONField(default=list, blank=True,
                                                help_text='e.g. ["text", "json", "markdown"]')
    avg_completion_time = models.IntegerField(default=30,
                                              help_text='Estimated task completion time in seconds')
    max_concurrent_tasks = models.IntegerField(default=5,
                                               help_text='Max tasks the agent can handle simultaneously')

    # ── Step 3: Payment Setup (Section 3.5) ──
    wallet_address = models.CharField(max_length=255, blank=True, default='',
                                      help_text='Arc wallet address for USDC payouts')
    payout_frequency = models.CharField(max_length=20, choices=PAYOUT_FREQUENCY_CHOICES, default='per_task')
    min_payout_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=5.00,
                                               help_text='Minimum earnings before payout (USD)')

    # ── Step 4: Pricing (Section 3.6) ──
    base_price_per_task = models.DecimalField(max_digits=10, decimal_places=2, default=1.00,
                                              help_text='Base price in Credits')
    per_page_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00,
                                          help_text='Additional price per page for document tasks')
    per_minute_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00,
                                            help_text='Additional price per minute for audio/video')
    surge_pricing_enabled = models.BooleanField(default=False,
                                                 help_text='Allow higher rates during high demand')

    # ── Profile & Performance (Section 3.7 / 3.8) ──
    trust_score = models.FloatField(default=0.0, help_text='0-100, assigned by Jarvis after vetting')
    rating = models.FloatField(default=0.0)
    success_rate = models.FloatField(default=0.0, help_text='Percentage 0-100')
    jobs_completed = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # ── Intelligence depth (shared knowledge base) ──
    domain = models.CharField(max_length=100, default='general',
                              help_text='Primary domain for orchestrator matching')
    retrieval_depth = models.IntegerField(default=2,
                                          help_text='Number of RAG docs to retrieve from shared knowledge base')

    # ── Vetting (Section 3.7) ──
    vetting_test_passed = models.BooleanField(default=False)
    vetting_test_result = models.JSONField(null=True, blank=True,
                                           help_text='Results from automated sample task test')
    rejection_reason = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_active(self):
        return self.status == 'active'

    def __str__(self):
        return f"{self.name} ({self.agent_type}) [{self.status}]"


# ──────────────────────────────────────────────
# GOAL & TASK ORCHESTRATION
# ──────────────────────────────────────────────

class Goal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    raw_input = models.TextField(help_text="e.g. 'I want to build a 3-bedroom house'")
    status = models.CharField(max_length=50, default='pending', choices=[
        ('pending', 'Pending'),
        ('decomposing', 'Decomposing'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Goal: {self.raw_input[:50]}..."


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='tasks')
    task_type = models.CharField(max_length=100, help_text="e.g. 'Construction planning'")
    domain = models.CharField(max_length=100, default='general',
                              help_text="Domain tag set by the orchestrator for agent matching")
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, default='pending', choices=[
        ('pending', 'Pending'),
        ('agent_selection', 'Waiting for Agent'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Task: {self.task_type} [{self.domain}]"


class TaskRecommendation(models.Model):
    """Agents recommended by the Orchestrator for a specific task."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='recommendations')
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='recommended_for')
    rank = models.IntegerField(default=0, help_text="Orchestrator ranking: 1 = best fit")
    reason = models.CharField(max_length=255, blank=True, default='',
                              help_text="Why the orchestrator recommended this agent")

    class Meta:
        unique_together = ('task', 'agent')
        ordering = ['rank']

    def __str__(self):
        return f"Rec: {self.agent.name} for {self.task.task_type} (rank {self.rank})"


# ──────────────────────────────────────────────
# ASSIGNMENTS, PAYMENTS, RATINGS
# ──────────────────────────────────────────────

class TaskAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='assignments')
    status = models.CharField(max_length=50, default='assigned', choices=[
        ('assigned', 'Assigned'),
        ('executing', 'Executing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ])
    output_result = models.JSONField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('task', 'agent')

    def __str__(self):
        return f"{self.agent.name} -> {self.task.task_type}"


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    assignment = models.OneToOneField(TaskAssignment, on_delete=models.CASCADE, related_name='transaction')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USDC')
    status = models.CharField(max_length=50, default='escrow', choices=[
        ('escrow', 'In Escrow'),
        ('released', 'Released to Agent'),
        ('refunded', 'Refunded to User'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Txn {self.id} | {self.status} | {self.amount} {self.currency}"


class AgentRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings_given')
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='ratings')
    assignment = models.OneToOneField(TaskAssignment, on_delete=models.CASCADE, related_name='rating')
    score = models.IntegerField(help_text="Rating 1-5")
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'assignment')

    def __str__(self):
        return f"{self.user.username} rated {self.agent.name}: {self.score}/5"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"To {self.user.username}: {self.title}"
