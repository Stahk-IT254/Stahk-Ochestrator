"""
Management command to clear seeded/demo data.
Run: python manage.py clear_data
"""
from django.core.management.base import BaseCommand
from core.models import Agent, Goal, Task, TaskRecommendation, TaskAssignment, Transaction, AgentRating


class Command(BaseCommand):
    help = 'Clear all seeded agents and related data (goals, tasks, assignments, transactions, ratings)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--agents-only',
            action='store_true',
            help='Only clear agents (leave goals/tasks intact)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear everything including goals and user data',
        )

    def handle(self, *args, **options):
        if options['agents_only']:
            count = Agent.objects.count()
            Agent.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f'✓ Cleared {count} agents.'))
        elif options['all']:
            counts = {
                'AgentRatings': AgentRating.objects.all().delete()[0],
                'Transactions': Transaction.objects.all().delete()[0],
                'TaskAssignments': TaskAssignment.objects.all().delete()[0],
                'TaskRecommendations': TaskRecommendation.objects.all().delete()[0],
                'Tasks': Task.objects.all().delete()[0],
                'Goals': Goal.objects.all().delete()[0],
                'Agents': Agent.objects.all().delete()[0],
            }
            for model, count in counts.items():
                self.stdout.write(self.style.SUCCESS(f'  ✓ Cleared {count} {model}'))
            self.stdout.write(self.style.SUCCESS('\nAll data cleared.'))
        else:
            # Default: clear agents and their downstream data
            counts = {
                'AgentRatings': AgentRating.objects.all().delete()[0],
                'Transactions': Transaction.objects.all().delete()[0],
                'TaskAssignments': TaskAssignment.objects.all().delete()[0],
                'TaskRecommendations': TaskRecommendation.objects.all().delete()[0],
                'Agents': Agent.objects.all().delete()[0],
            }
            for model, count in counts.items():
                self.stdout.write(self.style.SUCCESS(f'  ✓ Cleared {count} {model}'))
            self.stdout.write(self.style.SUCCESS('\nSeed data cleared. Goals and tasks preserved.'))
