-- Track whether the photographer has seen a new submission
alter table questionnaire_submissions
  add column if not exists submission_status text not null default 'new'
    check (submission_status in ('new', 'viewed'));
