import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, Card, EmptyState } from '../../components/ui';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access to it."
        action={
          <Link to={user ? HOME_BY_ROLE[user.role] : '/login'}>
            <Button>Go to dashboard</Button>
          </Link>
        }
      />
    </Card>
  );
}
