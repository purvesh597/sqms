import { useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton, Table, Td, Th, Tr } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { adminService } from '../../services/admin.service';
import { formatDateTime } from '../../utils/format';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const students = useFetch(() => adminService.students(q), [q]);

  return (
    <div>
      <PageHeader title="Students" description={students.data ? `${students.data.length} registered students` : 'Registered students'} />
      <Card>
        <div className="border-b border-line p-4">
          <Input aria-label="Search students" placeholder="Search by name, email or roll number" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="max-w-sm" />
        </div>
        {students.loading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : students.error ? (
          <ErrorState message={students.error} onRetry={students.retry} />
        ) : !students.data?.length ? (
          <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No students found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll no.</Th>
                <Th>Hostel</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Served</Th>
                <Th>Last sign-in</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {students.data.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-ink-muted">{s.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="tabular">{s.rollNumber}</Td>
                  <Td className="text-ink-muted">{s.hostel ?? '—'}</Td>
                  <Td className="tabular text-right">{s.totalTokens}</Td>
                  <Td className="tabular text-right">{s.servedTokens}</Td>
                  <Td className="text-ink-muted">{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : 'Never'}</Td>
                  <Td>{s.isActive ? <Badge tone="green" dot>Active</Badge> : <Badge>Inactive</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
