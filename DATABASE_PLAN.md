# AccuNumbo Database Plan

Production backend:
- Secure managed authentication (never store raw passwords ourselves)
- users/profiles
- roles: student, teacher, admin
- adventures, tasks, task_attempts
- adventure_progress
- xp_transactions, coin_transactions
- badges, user_badges
- feedback
- classes, class_members, assignments
- analytics_events

Privacy:
- Collect only necessary data.
- Clearly explain what is collected and why.
- Add appropriate consent/privacy controls.
- For school-age users, implement applicable parental/school consent and child-data safeguards before collecting personal information.
