# Database Schema Documentation

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ SUBSCRIPTION : "has"
    USER ||--o{ CODE : "writes"
    USER ||--o{ SUBMISSION : "makes"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ PROGRESS : "tracks"
    USER ||--o{ COMMUNITY : "participates in"
    
    COURSE ||--o{ SUBSCRIPTION : "has"
    COURSE ||--o{ LESSON : "contains"
    COURSE ||--|| IMAGE : "has"
    COURSE ||--|| CATEGORY : "belongs to"
    COURSE ||--|| INSTRUCTOR : "taught by"
    
    PROBLEMLIST ||--o{ TESTCASE : "has"
    PROBLEMLIST ||--o{ CODE : "has"
    PROBLEMLIST ||--o{ APPROACHES : "has"
    PROBLEMLIST ||--o{ COMMENT : "has"
    PROBLEMLIST ||--o{ COMMUNITY : "discusses"
    PROBLEMLIST ||--o{ STARTERCODE : "has"
    PROBLEMLIST ||--o{ PROGRESS : "tracks"
    PROBLEMLIST ||--o{ CONSTRAINTS : "has"
    PROBLEMLIST ||--o{ HINT : "has"
    
    SUBSCRIPTION }o--|| COUPON : "uses"
    
    IMAGE ||--o{ INSTRUCTOR : "uses"

    USER {
        string _id
        string name
        string email
        number phone
        string password
        string role
        string bio
        boolean isDeleted
        boolean isVerified
        string otp
        date otpExpiry
        string resetOtp
        date resetOtpExpiry
        date createdAt
        date modifiedAt
        string refreshToken
        string avatar
        string username
    }
    
    COURSE {
        string _id
        string type
        string title
        string description
        string about
        string duration
        array whatYouWillLearn
        array requirements
        array courseIncludes
        number price
        number originalPrice
        ObjectId image
        ObjectId instructor
        ObjectId category
        array lessons
        date createdAt
        date modifiedAt
    }
    
    PROBLEMLIST {
        string _id
        string quesId
        string quesName
        string quesDesc
        string difficulty
        ObjectId problemExample
        array code
        ObjectId contraints
        array tags
        date createdAt
        date modifiedAt
    }
```

## Class Diagram

```mermaid
classDiagram
    class User {
        +String _id
        +String name
        +String email
        +Number phone
        +String password
        +String role
        +String bio
        +Boolean isDeleted
        +Boolean isVerified
        +String otp
        +Date otpExpiry
        +String resetOtp
        +Date resetOtpExpiry
        +Date createdAt
        +Date modifiedAt
        +String refreshToken
        +String avatar
        +String username
        +hasMany(Subscription)
        +hasMany(Code)
        +hasMany(Submission)
        +hasMany(Comment)
        +hasMany(Progress)
    }
    
    class Course {
        +String _id
        +String type
        +String title
        +String description
        +String about
        +String duration
        +Array whatYouWillLearn
        +Array requirements
        +Array courseIncludes
        +Number price
        +Number originalPrice
        +ObjectId image
        +ObjectId instructor
        +ObjectId category
        +Array lessons
        +Date createdAt
        +Date modifiedAt
        +hasMany(Subscription)
        +belongsTo(Image)
        +belongsTo(Category)
        +belongsTo(Instructor)
    }
    
    class ProblemList {
        +String _id
        +String quesId
        +String quesName
        +String quesDesc
        +String difficulty
        +ObjectId problemExample
        +Array code
        +ObjectId contraints
        +Array tags
        +Date createdAt
        +Date modifiedAt
        +hasMany(TestCase)
        +hasMany(Approaches)
        +hasMany(Comment)
        +hasMany(StarterCode)
        +hasMany(Progress)
        +hasOne(Constraints)
        +hasOne(Hint)
    }
    
    class Subscription {
        +String _id
        +ObjectId user
        +ObjectId course
        +String accessType
        +String courseType
        +String subscriptionPlan
        +Date startDate
        +Date endDate
        +String status
        +Object payment
        +Boolean isDeleted
        +ObjectId coupon
        +Boolean autoRenew
        +belongsTo(User)
        +belongsTo(Course)
        +belongsTo(Coupon)
    }
    
    class Code {
        +String _id
        +String quesId
        +ObjectId userId
        +String code
        +String codelanguage
        +Date createdAt
        +Date modifiedAt
        +belongsTo(User)
        +belongsTo(ProblemList)
    }
    
    User "1" -- "*" Subscription
    Course "1" -- "*" Subscription
    User "1" -- "*" Code
    ProblemList "1" -- "*" Code
```

## Use Case Diagram

```mermaid
flowchart TD
    subgraph User Management
        A[Register User] --> B[Verify Email OTP]
        B --> C[Login User]
        C --> D[Reset Password]
        D --> E[Update Profile]
        E --> F[Manage Subscription]
    end
    
    subgraph Content Management
        G[Create Course] --> H[Upload Course Image]
        H --> I[Manage Lessons]
        I --> J[Publish Course]
        J --> K[Create Coding Problem]
        K --> L[Add Test Cases]
        L --> M[Add Starter Code]
    end
    
    subgraph Learning Experience
        N[Enroll in Course] --> O[Watch Lessons]
        O --> P[Solve Coding Problems]
        P --> Q[Submit Solutions]
        Q --> R[Check Progress]
        R --> S[Participate in Community]
    end
    
    subgraph Administrative Functions
        T[Manage Users] --> U[Manage Content]
        U --> V[View Analytics]
        V --> W[Process Payments]
        W --> X[Manage Coupons]
    end
    
    A -.-> N
    F -.-> N
    G -.-> U
    K -.-> U
    P -.-> Q
    Q -.-> R
```

## Sequence Diagrams

### User Registration Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant E as Email Service
    
    U->>F: Fill registration form
    F->>B: POST /api/register
    B->>DB: Check if user exists
    DB-->>B: User not found
    B->>B: Generate OTP
    B->>DB: Save user with OTP
    B->>E: Send verification email with OTP
    E-->>U: Email with OTP
    U->>F: Enter OTP
    F->>B: POST /api/verify-otp
    B->>DB: Verify OTP
    DB-->>B: OTP valid
    B->>DB: Mark user as verified
    B-->>F: Registration successful
    F-->>U: Redirect to login
```

### Course Enrollment Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant P as Payment Gateway
    
    U->>F: Click "Enroll in Course"
    F->>B: GET /api/course/{id}
    B->>DB: Fetch course details
    DB-->>B: Course data
    B-->>F: Course details and price
    U->>F: Proceed to payment
    F->>B: POST /api/subscribe
    B->>P: Initiate payment
    P-->>U: Payment interface
    U->>P: Complete payment
    P-->>B: Payment confirmation
    B->>DB: Create subscription record
    B->>DB: Update user courses
    DB-->>B: Success
    B-->>F: Enrollment confirmed
    F-->>U: Access to course granted
```

### Code Submission Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant JE as Judge Engine
    
    U->>F: Write code solution
    U->>F: Click "Submit"
    F->>B: POST /api/submit-code
    B->>DB: Save code
    B->>JE: Send code for evaluation
    JE->>JE: Run test cases
    JE-->>B: Test results
    B->>DB: Save submission results
    B->>DB: Update progress
    DB-->>B: Success
    B-->>F: Submission results
    F-->>U: Display results
```

## Database Schema Details

### Collections Overview

1. **User**: Manages user accounts, authentication, and profiles
2. **Course**: Contains course and tutorial content with lessons
3. **ProblemList**: Stores coding problems with metadata
4. **Code**: User-submitted code solutions
5. **Submission**: Records of code submission attempts and results
6. **Approaches**: Different solution approaches for problems
7. **TestCase**: Test cases for validating code solutions
8. **StarterCode**: Starter code templates for different languages
9. **Subscription**: Manages user course subscriptions and payments
10. **Coupon**: Discount coupons for course purchases
11. **Community**: Discussion forum for problems
12. **Comment**: User comments on problems
13. **Progress**: Tracks user progress on problems
14. **Image**: Stores image metadata and URLs
15. **Instructor**: Course instructors information
16. **Category**: Course categories
17. **Constraints**: Problem constraints
18. **Hint**: Hints for solving problems

### Key Relationships

- **User-Course**: Through Subscription model (many-to-many)
- **User-Problem**: Through Code, Submission, Progress models (many-to-many)
- **Course-Lesson**: One-to-many embedded relationship
- **Problem-TestCase**: One-to-many relationship
- **Problem-Approach**: One-to-many relationship

### Indexing Recommendations

Based on the schema, consider adding indexes on:

1. `User.email` (unique)
2. `User.phone` (unique)
3. `User.username` (unique)
4. `Course.type` 
5. `ProblemList.difficulty`
6. `ProblemList.tags`
7. `Subscription.status`
8. `Subscription.user` + `Subscription.course` (compound)
9. `Code.userId` + `Code.quesId` (compound)
10. `Comment.quesId`

This schema supports a comprehensive learning platform with course management, coding practice, and community features.