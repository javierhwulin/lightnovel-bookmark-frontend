# Light Novel Bookmarks Frontend

A modern frontend built with SvelteKit for managing your light novel reading journey. This application connects to the [Light Novel Bookmarks Backend API](https://github.com/javierhwulin/lightnovel-bookmark-backend) to provide a complete novel tracking solution.

## 🚀 Features

### Novel Management

- **Browse and search** your novel library with advanced filtering
- **Add novels manually** or import from Novel Updates URLs
- **Track reading progress** with chapter and volume management
- **Favorite novels** for quick access
- **Rate and review** novels with personal notes
- **Genre-based filtering** and organization

### Web Scraping Integration

- **Novel Updates integration** for automatic novel import
- **Preview functionality** to verify novel information before importing
- **Automatic metadata extraction** including cover images, descriptions, and genres

### Modern UI/UX

- **Responsive design** optimized for mobile and desktop
- **Beautiful interface** built with Tailwind CSS and Lucide icons
- **Real-time updates** with reactive state management
- **Loading states and error handling** for smooth user experience

## 🛠️ Tech Stack

- **SvelteKit** - Full-stack framework with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Svelte** - Beautiful icons
- **Native Fetch API** - HTTP client for backend communication
- **Svelte Stores** - State management

## 🏃 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Running [Backend API](https://github.com/javierhwulin/lightnovel-bookmark-backend) on `http://localhost:8000`

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-repo/lightnovel-bookmarks-frontend.git
   cd lightnovel-bookmarks-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   Create a `.env` file in the root directory:

   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:8000/api

   # App Configuration
   VITE_APP_TITLE="Light Novel Tracker"
   VITE_APP_DESCRIPTION="Manage your reading journey"
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Make sure the backend API is running on http://localhost:8000

## 📚 API Integration

### Stores Architecture

The application uses Svelte stores for state management with the following structure:

```typescript
// Main novel store with CRUD operations
import { novelsStore } from '$lib/stores/novels.js';

// Available methods:
await novelsStore.loadNovels(); // Load all novels
await novelsStore.createNovel(data); // Create new novel
await novelsStore.updateNovel(id, data); // Update existing novel
await novelsStore.deleteNovel(id); // Delete novel
await novelsStore.previewNovel(url); // Preview from Novel Updates
await novelsStore.importNovel(url); // Import from Novel Updates
novelsStore.toggleFavorite(id); // Toggle favorite status
```

### Derived Stores

```typescript
import {
	novels, // All novels array
	novelsLoading, // Loading state
	novelsError, // Error messages
	favoriteNovels, // Filtered favorites
	filteredNovels // Combined search/filter function
} from '$lib/stores/novels.js';
```

### API Client

```typescript
import { api } from '$lib/api/novels.js';

// Direct API access if needed
const novels = await api.getNovels();
const novel = await api.createNovel(data);
const preview = await api.previewNovel({ url });
```

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── api/           # API client layer
│   │   └── novels.ts  # Novel endpoints
│   ├── stores/        # Svelte stores
│   │   └── novels.ts  # Novel state management
│   ├── types/         # TypeScript interfaces
│   │   └── novel.ts   # Novel and API types
│   ├── config/        # Configuration
│   │   └── env.ts     # Environment variables
│   └── index.ts       # Library exports
├── routes/
│   ├── +layout.svelte # App layout
│   └── +page.svelte   # Main page component
└── app.html           # HTML template
```

## 🎨 Customization

### Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:8000/api)
- `VITE_APP_TITLE` - Application title
- `VITE_APP_DESCRIPTION` - Application description

### API Configuration

The API client automatically adapts to different backend URLs. Update the environment variable or modify `src/lib/config/env.ts` for custom configurations.

### UI Themes

The application uses Tailwind CSS. Customize colors and styling by modifying the Tailwind configuration or component classes.

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Svelte Check** for component validation

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Environment Configuration

For production, ensure environment variables are properly set:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

### Static Site Generation

The app is configured for static site generation. Deploy the `build/` directory to any static hosting service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and TypeScript conventions
- Add proper type definitions for new features
- Test all CRUD operations with the backend API
- Ensure responsive design on mobile and desktop
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Light Novel Bookmarks Backend](https://github.com/javierhwulin/lightnovel-bookmark-backend) for the API
- SvelteKit for the excellent full-stack framework
- Tailwind CSS for the utility-first styling
- Lucide for the beautiful icon set
- Novel Updates for providing novel information

---

**Built with ❤️ for light novel enthusiasts**
