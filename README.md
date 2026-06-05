# 🏡 BookVilla

### Full-Stack Luxury Rental Platform

BookVilla is a production-ready full-stack rental marketplace that enables property owners to showcase luxury properties and allows users to discover, review, and manage listings seamlessly.

🔗 **Live Demo:** https://book-villa.vercel.app

---

## 🚀 Overview

BookVilla is a modern rental platform built using the MERN stack. It provides a secure and scalable environment where users can browse properties worldwide, leave reviews, upload images, and manage listings through role-based access control.

The project focuses on real-world software engineering practices including authentication, authorization, cloud media storage, interactive mapping, and responsive user experience.

---

## ✨ Features

### 👤 Authentication & Authorization

* Secure user registration and login
* JWT-based authentication
* Role-based access control
* Protected routes
* Session management

### 🏠 Property Listings

* Create new property listings
* Edit existing listings
* Delete listings
* View detailed property information
* Image gallery support

### 🌍 Interactive Mapping

* MapBox integration
* Geographical location visualization
* Interactive map markers
* Global property discovery

### ☁️ Cloud Media Storage

* Cloudinary integration
* Secure image uploads
* Optimized image delivery
* Cloud-based asset management

### ⭐ Reviews & Ratings

* User-generated reviews
* Rating system
* Review management
* Dynamic feedback display

### 🔍 Search Functionality

* Search properties efficiently
* Fast property discovery
* Improved user navigation

### 🛡️ Security

* Authentication middleware
* Authorization checks
* Input validation
* Error handling
* Flash messaging

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* Bootstrap
* JavaScript (ES6+)

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Cloud Services

* Cloudinary
* MapBox

### Authentication

* JWT (JSON Web Tokens)
* Passport.js

### Deployment

* Vercel

---

## 📊 Performance Metrics

| Metric                    | Score |
| ------------------------- | ----- |
| Lighthouse Best Practices | 100   |
| SEO                       | 91    |
| First Contentful Paint    | 1.4s  |
| Cumulative Layout Shift   | 0.002 |

---

## 🏗️ Project Architecture

```text
Client
   │
   ▼
Express Server
   │
 ┌─┴───────────────┐
 │                 │
 ▼                 ▼
MongoDB        Cloudinary
(Database)     (Images)
   │
   ▼
MapBox API
(Location Services)
```

---

## 📸 Screenshots

### Home Page

<img width="1896" height="967" alt="thumbnail2" src="https://github.com/user-attachments/assets/51fd5885-2a33-4e3d-9c18-33535b9d174f" />


### Property Listing

<img width="1904" height="852" alt="image" src="https://github.com/user-attachments/assets/10f674a9-6a04-466d-aeea-f2094f6fcf58" />


### Interactive Map

<img width="1229" height="757" alt="image" src="https://github.com/user-attachments/assets/a0d0bf81-fdb7-4460-95e7-58319cf6aed9" />


### Review System

<img width="1369" height="709" alt="image" src="https://github.com/user-attachments/assets/a5370baa-7934-4497-bc49-53f9317c950d" />


---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/BookVilla.git
```

### Navigate to Project

```bash
cd BookVilla
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
MONGO_URI=your_mongodb_connection
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_key
CLOUDINARY_SECRET=your_secret
MAPBOX_TOKEN=your_mapbox_token
SECRET=your_session_secret
```

### Run Development Server

```bash
npm start
```

---

## 🎯 Future Enhancements

* Property category filtering
* Advanced search functionality
* Booking system
* Payment gateway integration
* Wishlist functionality
* User dashboard analytics
* Mobile-first optimization
* Real-time notifications

---

## 👨‍💻 Author

### Md Ziaur Rahman

Full Stack Developer | MERN Stack Engineer

* Portfolio: https://portfolio-ziaur.vercel.app
* LinkedIn: https://linkedin.com/in/md-ziaur-rahman-01031228a
* GitHub: https://github.com/iZiaur

---

## ⭐ Support

If you found this project useful, consider giving it a star on GitHub.
