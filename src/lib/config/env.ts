// Environment configuration
export const config = {
	API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
	APP_TITLE: 'Light Novel Tracker',
	APP_DESCRIPTION: 'Manage your reading journey'
};

// Validate required environment variables
export function validateConfig() {
	const required = ['API_BASE_URL'];
	const missing = required.filter(key => !config[key as keyof typeof config]);
	
	if (missing.length > 0) {
		console.warn(`Missing environment variables: ${missing.join(', ')}`);
	}
}

// Initialize configuration validation
validateConfig(); 