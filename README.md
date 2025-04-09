# CoderHaveli UML Diagrams & ER Diagram

## 📘 ER Diagram (Textual - Markdown Representation)

```text
[User]───┐
         │
         │         ┌──────────────┐
         └────────▶│ Submissions │
                   └──────────────┘

[Instructor]──┬────────▶[Course]
              └────────▶[Tutorial]

[Course]──▶[Image]
[Course]──▶[Category]

[Tutorial]──▶[Image]
[Tutorial]──▶[Category]

[Course]──▶[Instructor]
[Tutorial]──▶[Instructor]

[ProblemList]──┬────────▶[ProblemExample]
               ├────────▶[Code]──▶[Approaches]
               ├────────▶[Constraints]
               ├────────▶[Faqs]
               └────────▶[TestCase]
```

## 🔹 Use Case Diagram (Textual - Markdown Representation)

```text
       +--------+       +--------+       +------+
       |  User  |       |Instructor|     | Admin|
       +--------+       +--------+       +------+
            |                |              |
     +----------------+       |              |
     | Register/Login |       |              |
     +----------------+       |              |
            |                |              |
  +---------------------+     |              |
  | View Courses/Tutorials |  |              |
  +---------------------+     |              |
            |                |              |
     +----------------+       |              |
     | Solve Problems |       |              |
     +----------------+       |              |
            |                |              |
     +----------------+       |              |
     | Submit Code    |       |              |
     +----------------+       |              |
            |                |              |
     +------------------------+              |
     | View Test Cases & Explanations       |
     +------------------------+              |
                              |              |
                   +------------------+      |
                   | Add Course       |      |
                   +------------------+      |
                              |              |
                   +--------------------------+
                   | Add Problems w/ Details  |
                   +--------------------------+
```

## 🔸 Class Diagram (Textual - Markdown Representation)

```text
+--------------+       +-------------+       +--------------+
|   User       |       | Instructor  |       |   Category   |
+--------------+       +-------------+       +--------------+
| - name       |       | - name      |       | - name       |
| - email      |       | - email     |       +--------------+
| - password   |       | - bio       |
| - role       |       | - imageUrl  |       +------------+
| - createdAt  |       +-------------+       |   Image     |
+--------------+                           +------------+
                                             | - url     |
                                             | - type    |
                                             +------------+

+--------------+       +--------------+       +--------------+
|   Course     |------▶| Instructor   |       |   Tutorial   |
+--------------+       +--------------+       +--------------+
| - title      |       | - name       |       | - title      |
| - desc       |       | - email      |       | - desc       |
| - image      |       +--------------+       | - image      |
| - category   |                             | - instructor |
| - duration   |                             | - category   |
+--------------+                             +--------------+

+----------------+       +------------------+       +-------------------+
|  ProblemList   |------▶|   ProblemExample |       |   Constraints     |
+----------------+       +------------------+       +-------------------+
| - quesID       |       | - input          |       | - constraints[]   |
| - quesName     |       | - output         |       +-------------------+
| - difficulty   |       | - explanation    |
| - code[]       |       +------------------+
| - constraints  |                            +--------------------+
+----------------+                            |        Code        |
                                              +--------------------+
                                              | - code             |
                                              | - language         |
                                              | - complexityType   |
                                              +--------------------+

+----------------+         +----------------+
|  Approaches    |◀--------|     Code       |
+----------------+         +----------------+
| - approachType |
| - approachDesc |
+----------------+
```

## 🔁 Sequence Diagram (Markdown Representation - User Submitting Code)

```text
User        Frontend        Backend API        MongoDB
 |              |                |                |
 | --login-->   |                |                |
 |              | --POST/login-->                |
 |              |                | --find user-->|
 |              |                |<--user OK-----|
 |<--dashboard--|                |                |
 |              | --GET/problem->|                |
 |              |                |--find ques--> |
 |              |                |<--ques data-- |
 |<--problem----|                |                |
 | --write code-|                |                |
 | --submit---->| --POST/code--->|                |
 |              |                |--insert code->|
 |              |                |<--acknowledge-|
 |<--response---|                |                |
```

---


# 📚 CoderHaveli MongoDB Schema

This repository defines the **Mongoose schemas** used in the CoderHaveli project — a full-stack educational platform offering DSA practice, tutorials, code execution, and community features.

## 🛠️ Technologies

- **MongoDB** + **Mongoose** for data modeling
- **bcrypt.js** for password hashing

---

## 📦 Models Overview

### 🔐 `User`
Handles registration/login with hashed passwords and roles.
```js
name, email, password (hashed), role, isDeleted, createdAt, modifiedAt
```

### 🧑‍🏫 `Instructor`
Profile for course/tutorial creators.
```js
name, email, bio, imageUrl (ref to Image), createdAt
```

### 🖼️ `Image`
Stores image URLs and types used across tutorials and courses.
```js
imageId, url, imageType, uploadedAt
```

### 📂 `Category`
Used to classify `Course` and `Tutorial` entries.
```js
name
```

---

## 🎓 Learning Modules

### 📘 `Course`
```js
title, description, image (ref), instructor (ref), category (ref), price, duration, createdAt, modifiedAt
```

### 📗 `Tutorial`
```js
title, description, image (ref), instructor (ref), category (ref), createdAt, modifiedAt
```

---

## 💻 Problem Solving System

### 🧠 `ProblemList`
Main problem schema.
```js
quesID, quesName, quesDesc, difficulty, problemExample (ref), code [ref], constraints (ref), createdAt, modifiedAt
```

### 👨‍💻 `Code`
Stores code solutions for a question.
```js
quesID, quesName, code, codelanguage, complexityType, time_complexity, space_complexity, createdAt, modifiedAt
```

### 🔍 `ProblemExample`
```js
quesID, input, output, explanation
```

### ✅ `Constraints`
```js
quesID, constraints [String[]]
```

### 💡 `Approaches`
```js
quesID, approachType, approachDesc, code (ref), createdAt, modifiedAt
```

### 🧪 `TestCase`
```js
quesID, input, output
```

### 📤 `Submissions`
Stores user's submitted solutions.
```js
quesID, code, createdAt, modifiedAt
```

---

## 📈 User Engagement

### 🧾 `Progress`
Tracks user’s problem-solving progress.
```js
quesID, userID, progress, createdAt, modifiedAt
```

### 💬 `Community`
Discussion and Q&A per problem.
```js
quesID, userID, question, answer, createdAt, modifiedAt
```

### ❓ `Faqs`
Common questions related to a problem.
```js
quesID, question, answer
```

---

## 🔐 Password Hashing

User passwords are hashed using `bcryptjs` before storage:
```js
set: (v) => bcrypt.hashSync(v, bcrypt.genSaltSync(10))
```

---

## 📁 How to Use

1. Import the schema module into your backend:
```js
const mongoose = require('mongoose');
const db = require('./models')(mongoose);
```

2. Use models in controllers:
```js
const user = await db.User.findOne({ email });
```

---

## 📊 Entity Relationship Diagram (Markdown Format)

```md
User
├── name
├── email
├── password
├── role
└── isDeleted

Image
├── imageId
├── url
└── imageType

Instructor
├── name
├── email
├── bio
└── imageUrl ───► Image

Category
└── name

Course
├── title
├── description
├── image ───► Image
├── instructor ───► Instructor
└── category ───► Category

Tutorial
├── title
├── description
├── image ───► Image
├── instructor ───► Instructor
└── category ───► Category

ProblemList
├── quesID
├── quesName
├── quesDesc
├── difficulty
├── problemExample ───► ProblemExample
├── code ───► Code[]
└── constraints ───► Constraints

Code
├── quesID
├── quesName
├── code
├── codelanguage
└── complexityType

ProblemExample
├── quesID
├── input
└── output

Constraints
├── quesID
└── constraints[]

Approaches
├── quesID
├── approachDesc
└── code ───► Code

TestCase
├── quesID
├── input
└── output

Submissions
├── quesID
└── code

Progress
├── quesID
└── userID

Community
├── quesID
├── userID
├── question
└── answer

Faqs
├── quesID
├── question
└── answer
```

---

## 🤝 Contributions Welcome
Open to suggestions, improvements, or new model requests. Drop your ideas or open a pull request!

---

Built with 💙 by [Prashant Sharma](https://github.com/yourgithub)

