# Kinorbia 🌌

Kinorbia is a modern, full-stack movie discovery, tracking, and journaling platform. Built with Next.js and designed with a sleek, immersive "Modern Deep Space" aesthetic using Tailwind CSS v4, it allows users to explore movies, curate personalized lists, write reviews, and maintain a cinematic journal.

## 🚀 Features

* **Movie Discovery:** Search and browse through an extensive database of movies, including similar movie recommendations.
* **User Authentication:** Secure login and registration flows powered by NextAuth.js.
* **Personalized Profiles:** Manage your favorite movies, custom lists, and track your cinematic journey.
* **Cinematic Journal:** Write and maintain a personal journal of your movie-watching experiences.
* **Reviews & Ratings:** Rate movies and write comprehensive reviews to share your thoughts.
* **Curated Lists:** Create, manage, and customize movie lists for different moods or genres.
* **Modern UI/UX:** A clean, responsive interface utilizing Tailwind CSS v4 utility classes and optimized components.

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4
* **Database:** MongoDB (via Mongoose)
* **Authentication:** NextAuth.js

## 📦 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* MongoDB Database (e.g., MongoDB Atlas)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/kinorbia.git
    cd kinorbia
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add the following variables:
    ```env
    MONGODB_URI=your_mongodb_connection_string
    NEXTAUTH_SECRET=your_nextauth_secret
    NEXTAUTH_URL=http://localhost:3000
    # Add any external Movie API keys here if applicable
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the application in action.

## 📂 Project Structure

* `/app`: Next.js App Router containing pages, API routes, layouts, and Server Actions.
* `/components`: Reusable React components (`MovieCard`, `MovieCarousel`, `Navbar`, etc.).
* `/models`: Mongoose database schemas (`User`, `MovieList`, `JournalEntry`, `Review`).
* `/lib`: Utility functions, configuration, and database connection logic (`dbConnect.ts`).
* `/types`: Global TypeScript type definitions.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is open-source and available under the MIT License.