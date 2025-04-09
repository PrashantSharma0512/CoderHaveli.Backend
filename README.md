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

This markdown contains **text-based diagram representations** for CoderHaveli.
Let me know if you'd like this converted to a `.md` file download!

