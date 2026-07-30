# Fix: Grade Subjects Validation Error + Academic Years UI

## Steps Completed

### Step 1: `backend/src/app.js` - Mount academic-year routes
- [x] Import academic-year routes
- [x] Mount at `/api/v1/academic-years`
- [x] Fix error middleware to pass through actual error messages

### Step 2: `frontend/src/app/dashboard/grades/subjects/new/page.js` - Fix active year auto-select
- [x] Fix `activeYear?.id` → `activeYear?.data?.id`

### Step 3: Create Academic Years management pages
- [x] `frontend/src/services/academicYearService.js` - Added create/update/delete/setActive methods
- [x] `frontend/src/app/dashboard/settings/academic-years/page.js` - List page with activate/delete actions
- [x] `frontend/src/app/dashboard/settings/academic-years/page.module.css` - List page styles
- [x] `frontend/src/app/dashboard/settings/academic-years/new/page.js` - New academic year form
- [x] `frontend/src/app/dashboard/settings/academic-years/new/new.module.css` - Form styles

### Step 4: Restart backend server
- [ ] Need to restart backend for changes to take effect

