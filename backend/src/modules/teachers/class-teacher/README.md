# Class Teacher Assignment Module

## Overview

The Class Teacher Assignment module enables assigning one teacher as the homeroom/class teacher of a section for the current academic session. This is a key feature for school management systems where each class needs a designated homeroom teacher.

## Key Features

1. **One Teacher Per Section**: Only one teacher can be assigned as class teacher of a section within a given academic year
2. **Teacher Uniqueness**: A teacher can be class teacher of only one section at a time (within the same academic year)
3. **Automatic Subject Assignment**: Optionally add the class teacher to all subject assignments for that section
4. **Soft Deletion**: Assignments are soft-deleted to maintain historical records
5. **Date Tracking**: Assignments can have start and end dates for flexibility

## Database Schema

### Table: `class_teachers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `teacher_id` | UUID | Reference to teacher |
| `section_id` | UUID | Reference to section |
| `academic_year_id` | UUID | Reference to academic year |
| `start_date` | DATE | Assignment start date |
| `end_date` | DATE | Assignment end date (optional) |
| `status` | VARCHAR(20) | Status (ACTIVE, INACTIVE) |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

### Constraints

- **Unique per Section-AcademicYear**: Only one active class teacher per section per academic year
- **Unique per Teacher-AcademicYear**: One teacher can be class teacher of only one section per academic year
- **Date Validation**: `end_date >= start_date` (if both are provided)

## API Endpoints

### Base Path: `/api/v1/teachers/class-teachers`

All endpoints require authentication.

#### 1. List Class Teachers
**GET** `/`

Query Parameters:
- `teacher_id` (optional) - Filter by teacher
- `section_id` (optional) - Filter by section
- `academic_year_id` (optional) - Filter by academic year
- `status` (optional) - Filter by status (default: ACTIVE)
- `search` (optional) - Search by teacher name or section name
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

Response:
```json
{
  "success": true,
  "message": "Class teachers loaded successfully.",
  "data": {
    "page": 1,
    "limit": 20,
    "items": [
      {
        "id": "uuid",
        "teacher_id": "uuid",
        "teacher_name": "John Doe",
        "employee_number": "EMP001",
        "email": "john@school.com",
        "section_id": "uuid",
        "section_name": "Section A",
        "academic_year_id": "uuid",
        "academic_year_name": "2024-2025",
        "start_date": "2024-01-15",
        "end_date": null,
        "status": "ACTIVE",
        "notes": "Primary homeroom teacher",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### 2. Get Class Teacher by ID
**GET** `/:id`

Path Parameters:
- `id` (required) - Class teacher assignment ID

Response: Single class teacher object (same structure as list)

#### 3. Get Current Year Class Teacher
**GET** `/current-year/:section_id`

Path Parameters:
- `section_id` (required) - Section ID

Returns the active class teacher for the section in the current academic year (where `is_active = true`).

Response: Single class teacher object or null

#### 4. Create Class Teacher Assignment
**POST** `/`

Request Body:
```json
{
  "teacher_id": "uuid",
  "section_id": "uuid",
  "academic_year_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": null,
  "status": "ACTIVE",
  "notes": "Homeroom teacher for Section A",
  "addToTeacherSubjects": false
}
```

Fields:
- `teacher_id` (required) - UUID of the teacher
- `section_id` (required) - UUID of the section
- `academic_year_id` (required) - UUID of the academic year
- `start_date` (required) - Assignment start date (ISO format)
- `end_date` (optional) - Assignment end date (ISO format)
- `status` (optional) - ACTIVE or INACTIVE (default: ACTIVE)
- `notes` (optional) - Additional notes
- `addToTeacherSubjects` (optional) - If true, adds the teacher to all subject assignments for the section (default: false)

Response: Created class teacher object

Error Responses:
- `409 Conflict` - Teacher already assigned as class teacher or section already has a class teacher
- `400 Bad Request` - Validation error
- `404 Not Found` - Teacher, section, or academic year not found

#### 5. Update Class Teacher Assignment
**PUT** `/:id`

Path Parameters:
- `id` (required) - Class teacher assignment ID

Request Body (all fields optional):
```json
{
  "teacher_id": "uuid",
  "section_id": "uuid",
  "academic_year_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-12-31",
  "status": "ACTIVE",
  "notes": "Updated notes"
}
```

Response: Updated class teacher object

#### 6. Delete Class Teacher Assignment
**DELETE** `/:id`

Path Parameters:
- `id` (required) - Class teacher assignment ID

Response: Soft-deleted class teacher object

## Usage Examples

### Example 1: Assign a Teacher as Class Teacher
```bash
curl -X POST http://localhost:5000/api/v1/teachers/class-teachers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "teacher_id": "550e8400-e29b-41d4-a716-446655440000",
    "section_id": "550e8400-e29b-41d4-a716-446655440001",
    "academic_year_id": "550e8400-e29b-41d4-a716-446655440002",
    "start_date": "2024-01-15",
    "notes": "Homeroom teacher for class 9A",
    "addToTeacherSubjects": true
  }'
```

### Example 2: Get Class Teacher for Current Year
```bash
curl -X GET http://localhost:5000/api/v1/teachers/class-teachers/current-year/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <token>"
```

### Example 3: List All Class Teachers for Academic Year
```bash
curl -X GET "http://localhost:5000/api/v1/teachers/class-teachers?academic_year_id=550e8400-e29b-41d4-a716-446655440002&limit=50" \
  -H "Authorization: Bearer <token>"
```

### Example 4: Update Class Teacher Assignment
```bash
curl -X PUT http://localhost:5000/api/v1/teachers/class-teachers/550e8400-e29b-41d4-a716-446655440003 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "end_date": "2024-06-30",
    "notes": "Assignment ends mid-year"
  }'
```

## Business Logic

### Constraint 1: One Teacher Per Section
When creating a class teacher assignment, the system verifies that:
- No other teacher is already assigned as the active class teacher for this section in this academic year

### Constraint 2: Teacher Uniqueness
When creating a class teacher assignment, the system verifies that:
- The teacher is not already assigned as a class teacher in another section for this academic year

### Constraint 3: Auto Subject Assignment
If `addToTeacherSubjects` is true during creation:
- The teacher is automatically added to all subject-grade combinations for that section in the academic year
- Uses database ON CONFLICT DO NOTHING to handle cases where assignment already exists

## Integration with Other Modules

### Teacher Subjects Module
When a class teacher is assigned with `addToTeacherSubjects: true`, the system:
1. Queries the `grade_subjects` table for all subjects assigned to the section
2. Creates `teacher_subjects` entries for each subject
3. Handles conflicts gracefully if entries already exist

### Academic Year Module
- Uses the active academic year to fetch the current year's class teacher
- Validates that the academic year exists before creating assignments

### Section Module
- References sections to ensure they exist
- Can be extended to include class teacher information in section details

## Error Handling

### Custom Exceptions

- **ClassTeacherNotFoundError** (404)
  - Message: "Class teacher assignment not found"
  - Thrown when trying to access/update/delete non-existent assignment

- **ClassTeacherConflictError** (409)
  - Message: "Teacher is already assigned as class teacher in this academic year"
  - Message: "Section already has an active class teacher in this academic year"
  - Thrown when business logic constraints are violated

- **ClassTeacherValidationError** (400)
  - Message: "Teacher not found" / "Section not found" / etc.
  - Thrown when referenced entities don't exist

## Testing

Key scenarios to test:
1. Create class teacher assignment successfully
2. Prevent duplicate teacher-section assignments
3. Prevent single teacher having multiple class teachers
4. Update assignment details
5. Soft delete assignment
6. Validate all required fields
7. Handle date validations
8. Auto-add teacher to subject assignments
9. Pagination and filtering
10. Search functionality

## Future Enhancements

1. **Bulk Assignment**: Assign multiple teachers to multiple sections at once
2. **Assignment History**: Track teacher changes for a section
3. **Notifications**: Notify teacher when assigned as class teacher
4. **Reporting**: Generate reports of class teacher assignments
5. **Performance**: Add caching for frequently accessed assignments
6. **Validation**: Add additional business rule validations as needed
