"""
Management command to reset demo/test data from the database.
Clears Goals, Tasks, TaskAssignments, Transactions, AgentRatings,
and resets the PlatformWallet — leaving Users and Agents intact.

Run: python manage.py reset_demo_data
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Wipe Goals, Tasks, Transactions, and Ratings. Resets PlatformWallet. Keeps Users and Agents.'

    def handle(self, *args, **options):
        from core.models import Goal, Task, TaskAssignment, Transaction, AgentRating, PlatformWallet

        self.stdout.write(self.style.WARNING('⚠️  Starting demo data reset...'))

        # Order matters — delete children before parents to avoid FK errors
        rating_count = AgentRating.objects.count()
        AgentRating.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted {rating_count} AgentRatings'))

        txn_count = Transaction.objects.count()
        Transaction.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted {txn_count} Transactions'))

        assignment_count = TaskAssignment.objects.count()
        TaskAssignment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted {assignment_count} TaskAssignments'))

        task_count = Task.objects.count()
        Task.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted {task_count} Tasks'))

        goal_count = Goal.objects.count()
        Goal.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted {goal_count} Goals'))

        # Reset platform wallet
        try:
            wallet = PlatformWallet.get()
            wallet.balance = 0
            wallet.total_fees_collected = 0
            wallet.total_transactions = 0
            wallet.save()
            self.stdout.write(self.style.SUCCESS('  ✓ Platform Wallet reset to $0.00000'))
        except Exception:
            self.stdout.write(self.style.WARNING('  - PlatformWallet not yet migrated, skipping.'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅  Demo data reset complete. Users and Agents are preserved.'))
