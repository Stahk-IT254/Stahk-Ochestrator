from django.core.management.base import BaseCommand
from core.models import Agent
from core.services import VettingService

class Command(BaseCommand):
    help = 'Runs the automated VettingService on all pending agents.'

    def handle(self, *args, **options):
        pending_agents = Agent.objects.filter(status='pending')
        count = pending_agents.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No pending agents to vet."))
            return

        self.stdout.write(f"Found {count} pending agents. Running VettingService...\n")

        for agent in pending_agents:
            self.stdout.write(f"Vetting Agent: {agent.name} (ID: {agent.id})... ", ending='')
            try:
                passed = VettingService.vet_agent(agent)
                if passed:
                    self.stdout.write(self.style.SUCCESS("PASSED! Promoted to Active."))
                else:
                    self.stdout.write(self.style.ERROR(f"FAILED. Reason: {agent.rejection_reason}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"ERROR: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("\nVetting complete."))
