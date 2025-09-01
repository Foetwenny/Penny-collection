# Elongated Penny Collection Manager

A beautiful, modern web application for organizing and displaying your elongated penny collection with AI-powered research capabilities.

## 🔐 Configuration Setup

To use the AI penny analysis feature, you need to set up your Google AI credentials:

1. Copy `config.template.js` to `config.js`
2. Edit `config.js` and add your actual API key and project ID
3. **Never commit `config.js` to GitHub** (it's already in `.gitignore`)

## 🚀 Features

- **AI-Powered Penny Analysis**: Uses Google Gemini 2.5 Flash for intelligent penny identification
- **Album Management**: Organize pennies into themed collections
- **Image Compression**: Smart storage management to prevent quota issues
- **Backup & Restore**: Export/import your collection data
- **Responsive Design**: Works on desktop and mobile devices

## 📁 File Structure

- `index.html` - Main application
- `script.js` - Application logic and AI integration
- `styles.css` - Main styling
- `album-styles.css` - Album-specific styles
- `config.js` - **Your API credentials (DO NOT COMMIT)**
- `config.template.js` - Template for setting up credentials
- `.gitignore` - Prevents sensitive files from being committed

## Features

### 🖼️ Image Upload
- **Drag & Drop**: Simply drag and drop penny images onto the upload area
- **Click to Browse**: Traditional file browser option
- **Image Preview**: See your uploaded image before analysis
- **Multiple Formats**: Supports all common image formats (JPEG, PNG, GIF, etc.)

### 🤖 AI-Powered Analysis
- **Location Identification**: AI analyzes the penny design to identify its origin
- **Detailed Descriptions**: Get interesting historical and cultural context
- **Date Estimation**: AI provides estimated time periods for the penny
- **Simulated AI**: Currently uses realistic simulation data for demonstration

### 📚 Collection Management
- **Organized Display**: Beautiful grid layout showing all your pennies
- **Search Functionality**: Find specific pennies by name, location, or description
- **Sorting Options**: Sort by date collected, location, or name
- **Edit & Delete**: Modify details or remove items from your collection

### 💾 Data Persistence
- **Local Storage**: Your collection is automatically saved to your browser
- **No Account Required**: Works completely offline and locally
- **Export Ready**: Data structure allows for easy export/backup

## How to Use

### 1. Getting Started
1. Open `index.html` in your web browser
2. The application will load with an empty collection
3. Start by uploading your first elongated penny image

### 2. Adding a New Penny
1. **Upload Image**: Drag and drop an image or click "Choose Image"
2. **Preview**: Review your uploaded image
3. **Analyze**: Click "Analyze with AI" to get information about the penny
4. **Review Results**: Check the AI-generated location, description, and date
5. **Edit (Optional)**: Click "Edit Details" to modify the AI results
6. **Save**: Click "Save to Collection" to add it to your collection

### 3. Managing Your Collection
- **Search**: Use the search bar to find specific pennies
- **Sort**: Use the dropdown to sort by different criteria
- **Edit**: Click the "Edit" button on any penny to modify its details
- **Delete**: Click the "Delete" button to remove pennies from your collection

### 4. AI Analysis Details
The AI analysis provides:
- **Location**: Where the penny was likely created (e.g., "Disneyland, Anaheim, CA")
- **Description**: Historical and cultural context about the design
- **Estimated Date**: Time period when the penny was likely made

## Technical Details

### File Structure
```
├── index.html          # Main HTML file
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This documentation
```

### Technologies Used
- **HTML5**: Semantic markup and modern structure
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript (ES6+)**: Client-side functionality and data management
- **Local Storage**: Browser-based data persistence
- **Font Awesome**: Icons for enhanced UI
- **Google Fonts**: Inter font family for modern typography

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (responsive design)

## Future Enhancements

### Planned Features
- **Real AI Integration**: Connect to actual AI services for image analysis
- **Cloud Storage**: Option to backup collection to cloud services
- **Export/Import**: CSV/JSON export and import functionality
- **Statistics**: Collection analytics and insights
- **Sharing**: Share collections with friends and family
- **Advanced Search**: Filter by date ranges, locations, etc.

### AI Integration Possibilities
- **Google Vision API**: For image recognition and text extraction
- **OpenAI GPT**: For generating detailed descriptions
- **Custom ML Model**: Trained specifically on elongated penny designs

## Customization

### Styling
The application uses CSS custom properties and modern design principles. You can easily customize:
- Color scheme in `styles.css`
- Layout and spacing
- Typography and fonts
- Animation timings

### Functionality
The JavaScript is modular and well-commented. You can extend:
- AI analysis logic
- Storage methods
- Search and filter capabilities
- Export/import features

## Privacy & Security

- **Local Storage**: All data is stored locally in your browser
- **No Server**: No data is sent to external servers
- **Offline Capable**: Works completely offline
- **No Tracking**: No analytics or tracking code

## Support

### Common Issues
1. **Images not uploading**: Ensure the file is an image format (JPEG, PNG, etc.)
2. **Collection not saving**: Check if your browser supports local storage
3. **Layout issues**: Try refreshing the page or clearing browser cache

### Getting Help
- Check browser console for error messages
- Ensure JavaScript is enabled
- Try a different browser if issues persist

## License

This project is open source and available under the MIT License. Feel free to modify and distribute as needed.

---

**Enjoy organizing your elongated penny collection!** 🪙✨

