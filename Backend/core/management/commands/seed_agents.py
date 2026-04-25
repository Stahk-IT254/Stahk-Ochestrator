"""
Management command to seed the database with demo agents.
Run: python manage.py seed_agents
"""
from django.core.management.base import BaseCommand
from core.models import Agent


DEMO_AGENTS = [
    # Construction domain
    {
        'name': 'BuildSmart',
        'domain': 'construction',
        'short_description': 'Efficient construction planning with cost-optimized material selection.',
        'base_price_per_task': 0.035,
        'rating': 4.8,
        'success_rate': 95.0,
        'retrieval_depth': 5,
        'jobs_completed': 142,
    },
    {
        'name': 'QuickPlan',
        'domain': 'construction',
        'short_description': 'Fast construction estimates and basic planning outputs.',
        'base_price_per_task': 0.010,
        'rating': 4.2,
        'success_rate': 88.0,
        'retrieval_depth': 2,
        'jobs_completed': 89,
    },
    {
        'name': 'PremiumStruct',
        'domain': 'construction',
        'short_description': 'Comprehensive structural analysis with risk assessment and detailed timelines.',
        'base_price_per_task': 0.050,
        'rating': 4.9,
        'success_rate': 98.0,
        'retrieval_depth': 10,
        'jobs_completed': 203,
    },
    # Finance domain
    {
        'name': 'BudgetWise',
        'domain': 'finance',
        'short_description': 'Smart budgeting and savings optimization for individuals.',
        'base_price_per_task': 0.025,
        'rating': 4.6,
        'success_rate': 92.0,
        'retrieval_depth': 5,
        'jobs_completed': 167,
    },
    {
        'name': 'QuickCalc',
        'domain': 'finance',
        'short_description': 'Basic financial estimates and simple budget breakdowns.',
        'base_price_per_task': 0.008,
        'rating': 4.0,
        'success_rate': 85.0,
        'retrieval_depth': 2,
        'jobs_completed': 54,
    },
    {
        'name': 'FinanceElite',
        'domain': 'finance',
        'short_description': 'Detailed financial projections with risk modelling and investment advice.',
        'base_price_per_task': 0.045,
        'rating': 4.9,
        'success_rate': 97.0,
        'retrieval_depth': 10,
        'jobs_completed': 312,
    },
    # Scheduling domain
    {
        'name': 'TimeLine Pro',
        'domain': 'scheduling',
        'short_description': 'Detailed project scheduling with milestone tracking.',
        'base_price_per_task': 0.020,
        'rating': 4.5,
        'success_rate': 90.0,
        'retrieval_depth': 5,
        'jobs_completed': 98,
    },
    {
        'name': 'ScheduleQuick',
        'domain': 'scheduling',
        'short_description': 'Fast, simple scheduling outputs.',
        'base_price_per_task': 0.008,
        'rating': 4.1,
        'success_rate': 86.0,
        'retrieval_depth': 2,
        'jobs_completed': 45,
    },
    # Risk analysis domain
    {
        'name': 'RiskGuard',
        'domain': 'risk_analysis',
        'short_description': 'Comprehensive risk identification and mitigation strategies.',
        'base_price_per_task': 0.040,
        'rating': 4.7,
        'success_rate': 94.0,
        'retrieval_depth': 10,
        'jobs_completed': 76,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with demo agents for the marketplace'

    def handle(self, *args, **options):
        from django.contrib.auth.models import User

        # Create Dummy Supply-Side Users
        creator_names = ['creator_alice', 'creator_bob', 'creator_charlie']
        creators = []
        for cname in creator_names:
            user, created = User.objects.get_or_create(username=cname)
            if created:
                user.set_password('Creator123!')
                user.save()
            profile = user.profile
            profile.role = 'agent_creator'
            profile.save()
            creators.append(user)
            self.stdout.write(self.style.SUCCESS(f'Verified User: {cname} (Password: Creator123!)'))

        created_count = 0
        skipped_count = 0

        for i, agent_data in enumerate(DEMO_AGENTS):
            agent_data = dict(agent_data)  # copy to avoid mutating the list
            agent_data['api_endpoint'] = "http://127.0.0.1:8000/api/internal-agents/execute/"
            agent_data['status'] = "pending"
            agent_data['creator'] = creators[i % len(creators)]

            agent, created = Agent.objects.update_or_create(
                name=agent_data['name'],
                defaults=agent_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ Created: {agent.name} @ ${agent.base_price_per_task} USDC [PENDING] by {agent.creator.username}'
                ))
            else:
                skipped_count += 1
                self.stdout.write(self.style.WARNING(
                    f'  - Updated: {agent.name} @ ${agent.base_price_per_task} USDC [PENDING] by {agent.creator.username}'
                ))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done! Created {created_count} agents, updated {skipped_count}.'))
