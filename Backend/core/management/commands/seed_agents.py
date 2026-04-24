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
        'description': 'Efficient construction planning with cost-optimized material selection.',
        'price': 40.00,
        'rating': 4.8,
        'success_rate': 95.0,
        'tier': 'standard',
        'retrieval_depth': 5,
        'is_active': True,
        'jobs_completed': 142,
    },
    {
        'name': 'QuickPlan',
        'domain': 'construction',
        'description': 'Fast construction estimates and basic planning outputs.',
        'price': 25.00,
        'rating': 4.2,
        'success_rate': 88.0,
        'tier': 'basic',
        'retrieval_depth': 2,
        'is_active': True,
        'jobs_completed': 89,
    },
    {
        'name': 'PremiumStruct',
        'domain': 'construction',
        'description': 'Comprehensive structural analysis with risk assessment and detailed timelines.',
        'price': 60.00,
        'rating': 4.9,
        'success_rate': 98.0,
        'tier': 'premium',
        'retrieval_depth': 10,
        'is_active': True,
        'jobs_completed': 203,
    },
    # Finance domain
    {
        'name': 'BudgetWise',
        'domain': 'finance',
        'description': 'Smart budgeting and savings optimization for individuals.',
        'price': 30.00,
        'rating': 4.6,
        'success_rate': 92.0,
        'tier': 'standard',
        'retrieval_depth': 5,
        'is_active': True,
        'jobs_completed': 167,
    },
    {
        'name': 'QuickCalc',
        'domain': 'finance',
        'description': 'Basic financial estimates and simple budget breakdowns.',
        'price': 15.00,
        'rating': 4.0,
        'success_rate': 85.0,
        'tier': 'basic',
        'retrieval_depth': 2,
        'is_active': True,
        'jobs_completed': 54,
    },
    {
        'name': 'FinanceElite',
        'domain': 'finance',
        'description': 'Detailed financial projections with risk modelling and investment advice.',
        'price': 55.00,
        'rating': 4.9,
        'success_rate': 97.0,
        'tier': 'premium',
        'retrieval_depth': 10,
        'is_active': True,
        'jobs_completed': 312,
    },
    # Scheduling domain
    {
        'name': 'TimeLine Pro',
        'domain': 'scheduling',
        'description': 'Detailed project scheduling with milestone tracking.',
        'price': 35.00,
        'rating': 4.5,
        'success_rate': 90.0,
        'tier': 'standard',
        'retrieval_depth': 5,
        'is_active': True,
        'jobs_completed': 98,
    },
    {
        'name': 'ScheduleQuick',
        'domain': 'scheduling',
        'description': 'Fast, simple scheduling outputs.',
        'price': 20.00,
        'rating': 4.1,
        'success_rate': 86.0,
        'tier': 'basic',
        'retrieval_depth': 2,
        'is_active': True,
        'jobs_completed': 45,
    },
    # Risk analysis domain
    {
        'name': 'RiskGuard',
        'domain': 'risk_analysis',
        'description': 'Comprehensive risk identification and mitigation strategies.',
        'price': 50.00,
        'rating': 4.7,
        'success_rate': 94.0,
        'tier': 'premium',
        'retrieval_depth': 10,
        'is_active': True,
        'jobs_completed': 76,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with demo agents for the marketplace'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for agent_data in DEMO_AGENTS:
            agent, created = Agent.objects.get_or_create(
                name=agent_data['name'],
                defaults=agent_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {agent.name} ({agent.tier})'))
            else:
                skipped_count += 1
                self.stdout.write(self.style.WARNING(f'  - Skipped (exists): {agent.name}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done! Created {created_count} agents, skipped {skipped_count}.'))
