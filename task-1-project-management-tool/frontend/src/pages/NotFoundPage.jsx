import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useDocumentTitle } from '../hooks';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState title="Page not found" action={<Link to="/projects" className="btn btn-primary">Go to your projects</Link>}>
      The address may be mistyped, or the page was moved.
    </EmptyState>
  );
}
