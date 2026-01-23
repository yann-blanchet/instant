-- Add visit_tasks table for snapshot of tasks at visit completion
create table visit_tasks (
  id uuid primary key,
  visit_id uuid not null references visits(id),

  task_title text not null,
  status_at_visit text not null check (status_at_visit in ('open', 'done')),
  intervenant_name text,

  created_at timestamptz default now()
);

-- Create index on visit_id for faster lookups
create index visit_tasks_visit_id_idx on visit_tasks(visit_id);
