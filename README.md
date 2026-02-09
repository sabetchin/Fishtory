# Fishtory - Fisheries Data Management System

A comprehensive web-based platform for the Olongapo City Agricultural Office and local fisherfolk to streamline fisheries data collection, reporting, and analytics.

## Overview

**Fishtory** replaces paper-based reporting with a fast, user-friendly digital system that allows:

- **Fishermen**: Submit daily catch reports in under 1 minute using simplified digital forms
- **Agricultural Office**: Automate data collection, visualize fisheries trends, and communicate directly with registered fishermen

## Key Features

### For Fishermen
- **Quick Fish Catch Reporting**: Submit daily catch data with boat information, fish types, weight, and processing information
- **GPS-Based Port Logging**: Location tracking for catch reports
- **Voice-to-Text Support**: Optional voice input for faster reporting
- **Report History**: Track all submitted reports and their approval status
- **User Profile Management**: Maintain vessel and personal information
- **Real-time Notifications**: Receive weather advisories and fishing regulations

### For Agricultural Office
- **Comprehensive Dashboard**: Real-time overview of all fisheries data
- **Advanced Analytics**:
  - Catch trends and seasonal patterns
  - Fish species distribution analysis
  - Municipal breakdown of reports
  - Market value insights
- **Report Approval System**: Review and approve/reject fisherman submissions
- **Direct Communication**: Send broadcast messages and announcements to all registered fishermen
- **Data Management**: Manage fish species and processing types
- **Export Capabilities**: Generate reports and data exports

## System Architecture

### Components

```
/components
├── login-form.tsx           # Authentication interface (fisherman/admin)
├── navigation.tsx           # Top navigation bar
├── dashboard.tsx            # Dashboard router
├── fisherman-dashboard.tsx  # Fisherman portal with catch reporting
├── admin-dashboard.tsx      # Agricultural office analytics and management
├── registration-form.tsx    # New fisherman registration workflow
├── profile.tsx              # User profile and settings
├── species-management.tsx   # Fish species and processing management
```

### Design System

- **Color Scheme**: Ocean blues with professional accents for government/fisheries context
  - Primary: Deep ocean blue (primary actions)
  - Accent: Sky blue (secondary actions)
  - Neutrals: Light backgrounds with dark text
- **Typography**: Geist font family for clean, modern interface
- **Theme Support**: Light and dark modes

## Getting Started

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Login Credentials (Demo)

**Fisherman Portal**
- Fisherman ID: FM-2024-001
- Password: (any value)

**Agricultural Office**
- Staff Code: ADMIN-001
- Password: (any value)

## Usage Guide

### For Fishermen

1. **Login**: Enter your registration number and password
2. **Submit Report**: 
   - Click "New Report" tab
   - Fill in boat information
   - Select fish type and weight
   - Choose processing method
   - Submit in under 1 minute
3. **Track Status**: View all reports and their approval status
4. **Manage Profile**: Update vessel and personal information

### For Agricultural Office Staff

1. **Login**: Enter staff code and password
2. **View Analytics**: Monitor catch trends and statistics
3. **Review Reports**: Check pending fisherman submissions
4. **Approve/Reject**: Process submitted catch reports
5. **Send Communications**: Broadcast messages to all fishermen

## Features in Detail

### Fish Catch Reporting Form (Fisherman)

The reporting form includes:
- **Fisherman Identification**: Pre-filled registration number
- **Fish Capture Information**: Type (in Tagalog), weight, GPS location
- **Processing Types**: Fresh, Tinapa (Smoked), Dilis (Dried), Daing, Sardines
- **Municipal Information**: Automatic detection or manual selection
- **Voice Input Option**: Alternative voice-to-text method

### Admin Analytics Dashboard

Features include:
- **Real-Time Metrics**: Total reports, approved, pending, total catch weight
- **Trend Analysis**: Monthly catch and processing data visualization
- **Fish Distribution**: Pie chart showing species breakdown
- **Municipal Breakdown**: Bar chart of reports by municipality
- **Report Management**: Approve/reject individual submissions
- **Communication Hub**: Send advisories and announcements

### Species & Processing Management

Manage fish species and processing types with:
- Scientific and local names (Tagalog)
- Seasonal availability
- Market value indicators
- Processing methods
- Storage requirements

## Data Flow

1. **Fisherman Submits Report** → Report enters pending status
2. **Admin Reviews** → Approves or rejects with feedback
3. **Data Aggregated** → Dashboard updates with approved data
4. **Analytics Generated** → Trends and patterns analyzed
5. **Communications Sent** → Advisories broadcast to registered fishermen

## Technology Stack

- **Frontend**: React 19 with Next.js 16
- **Styling**: Tailwind CSS v4 with custom design tokens
- **UI Components**: shadcn/ui with Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: React Hooks (useState)
- **Charts**: Recharts library

## Customization

### Modifying Colors

Edit the color tokens in `/app/globals.css`:
```css
--primary: oklch(0.35 0.18 254);      /* Ocean blue */
--accent: oklch(0.45 0.16 240);       /* Sky blue */
--secondary: oklch(0.95 0.02 254);    /* Light blue */
```

### Adding New Fish Species

Use the Species Management component to add:
- Local names (Tagalog)
- English names
- Scientific names
- Processing methods
- Seasonal availability

### Customizing Processing Types

Configure available processing methods for your region through the Species Management interface.

## Future Enhancements

- Backend database integration (Supabase/PostgreSQL)
- SMS/Email notifications
- GPS real-time tracking
- Mobile app
- Advanced image recognition for fish identification
- Multi-language support
- Offline reporting capability
- Advanced data export (Excel, PDF)

## Security Notes

**Important**: This is a demo interface. For production deployment:
- Implement secure authentication (OAuth/JWT)
- Hash and salt passwords with bcrypt
- Use HTTPS/TLS encryption
- Implement Row-Level Security (RLS)
- Add rate limiting
- Validate all inputs server-side
- Use environment variables for sensitive data

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### Reports not appearing
- Ensure you're logged in as admin to see all reports
- Check report status (pending/approved/rejected)

### Form validation errors
- All required fields must be filled
- Email must be valid format
- Passwords must match
- Weight must be numeric

### Display issues
- Clear browser cache
- Try a different browser
- Check that JavaScript is enabled

## Support

For issues or feature requests, contact the Olongapo City Agricultural Office.

## License

This system is developed for the Olongapo City Agricultural Office.

---

**Version**: 1.0  
**Last Updated**: January 2024  
**System Name**: Fishtory - Fisheries Data Management System
