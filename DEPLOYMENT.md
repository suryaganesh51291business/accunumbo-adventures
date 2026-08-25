# AccuNumbo production deployment

Domain: https://accunumbo.com
Contact: hello@accunumbo.com
Phone: +91 96778 43439

This V4 package is a connected full-stack starter:
1. Node/Express API
2. SQLite database
3. bcrypt password hashing
4. JWT authentication
5. Student progress and task-attempt endpoints
6. Feedback endpoint
7. Existing website pages and logo

Before public launch:
- Set a strong JWT_SECRET in the hosting environment.
- Use HTTPS.
- Use a managed/production database instead of local SQLite if the service requires multiple server instances.
- Configure DNS for accunumbo.com and www.accunumbo.com.
- Configure email delivery for hello@accunumbo.com.
- Add a production privacy policy, terms, cookie/analytics notice, and appropriate consent controls.
- For school-age learners, implement applicable child/school/parent consent and data-minimisation requirements.
- Add rate limiting, CSRF/session protections as appropriate, backups, monitoring and admin access controls.

DNS/hosting cannot be actually changed from this chat without access to the domain registrar/hosting account.
