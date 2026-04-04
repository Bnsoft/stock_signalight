# Phase 9: Commercial Edition Features

## Overview

Phase 9 transforms Signalight into a complete SaaS platform with user authentication, commercial profit calculator, and investor-focused features.

## 🔐 G1: User Authentication + Guest Mode

### Features
- **Email/Password Registration & Login**
  - Secure password hashing with SHA-256
  - Email uniqueness validation
  - JWT token-based sessions (7-day expiry)
  - Account creation with optional display name

- **Guest Mode**
  - UUID-based sessions (no database storage)
  - Full feature access without registration
  - Perfect for testing and evaluation
  - Seamless conversion to registered account

- **Google OAuth Integration** (Ready for implementation)
  - One-click authentication
  - Automatic user creation
  - Social login UI components

### User Data Model
```
users:
  - id: UUID
  - email: unique email
  - display_name: customizable name
  - auth_method: password | google | guest
  - created_at: timestamp

user_preferences:
  - user_id: foreign key
  - theme: system | light | dark
  - notification_email: boolean
  - subscription_plan: guest | free | pro | pro+
  - api_calls_limit: configurable
```

### API Endpoints
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Email/password login
- `POST /auth/guest` - Create guest session
- `POST /auth/google` - Google OAuth callback
- `GET /auth/verify` - Verify and decode JWT token

## 👤 G2: User Profile & Settings

### Profile Page Features
- **User Information Display**
  - Display name and email
  - Authentication method badge
  - Member since date
  - User ID reference

- **Subscription Tier Display**
  - Current plan (Guest/Free/Pro/Pro+)
  - Feature availability per tier
  - Pricing information
  - Upgrade prompts

- **Navigation**
  - Quick links to settings
  - Access to calculation history
  - Account management options

### Settings Page Features
- **Theme Selection**
  - System (follow OS settings)
  - Light mode
  - Dark mode
  - Real-time preview

- **Notification Preferences**
  - Email notification toggle
  - Future: SMS, push notifications
  - Notification frequency settings

- **Subscription Management**
  - View current plan
  - Plan comparison
  - Upgrade options

- **Danger Zone**
  - Account deletion
  - Data export
  - Confirmation dialogs

### Calculation History
- View all saved calculations
- Filter by date or parameters
- Export as CSV
- Download selected calculations
- Delete old calculations

## 💰 G3: Profit Calculator Core Logic

### Calculator Inputs
1. **Principal Amount**
   - Range: $1,000 - $1,000,000
   - Slider + numeric input
   - Logarithmic scaling for UX

2. **Investment Period**
   - Range: 1 - 120 months
   - Real-time conversion to years
   - Slider adjustment

3. **Target ROI**
   - Range: 1% - 100%
   - Supports decimal values
   - Realistic to aggressive scenarios

4. **Interest Type**
   - Compound Interest: A = P(1+r)^t
   - Simple Interest: A = P(1+rt)

5. **Tax Bracket Selection**
   - No Tax
   - US Single / Married
   - US Capital Gains (Short/Long term)
   - Canada (50% inclusion rate)
   - UK Standard Rate
   - Singapore (No tax)
   - Australia (Progressive)

### Calculations Performed
```
Gross Profit = Final Value - Principal
Tax Amount = Gross Profit × Tax Rate
Net Profit = Gross Profit - Tax Amount
After-Tax ROI = (Net Profit / Principal) × 100
```

### Output Visualization
- **Results Summary Card**
  - Final Value (large, color-coded green)
  - Net Profit (blue)
  - Tax Amount (orange)
  - After-Tax ROI (primary color)

- **Monthly Growth Chart**
  - Line chart showing dual series
  - Before-tax equity curve
  - After-tax equity curve
  - Hover tooltips with exact values

- **ROI Scenario Comparison**
  - Bar chart: 5%, 10%, 15%, 20%, 25%, 30% ROI
  - Shows final value vs net profit
  - Interactive tooltips

- **Detailed Comparison Table**
  - ROI scenarios side-by-side
  - Final Value, Gross Profit, Tax, Net Profit columns
  - After-Tax ROI percentage
  - Hover effects for readability

### Key Takeaways Section
- Explains final value meaning
- After-tax ROI impact
- Compound vs simple interest benefits
- Tax planning importance

### Database Storage
```
calculations:
  - id: auto-increment
  - user_id: foreign key
  - principal: amount
  - period_months: duration
  - target_roi: percentage
  - final_value: calculated
  - net_profit: after tax
  - tax_amount: deducted
  - after_tax_roi: percentage
  - calculation_json: full data
  - created_at: timestamp
```

## 📈 G4: Backtest Integration

### Backtest Results Page
- **Equity Curve Visualization**
  - 90-day performance curve
  - Daily growth projection
  - Account value tracking

- **Performance Metrics**
  - Total ROI (%)
  - Win Rate (%)
  - Max Drawdown (%)
  - Sharpe Ratio
  - Trading statistics

- **Trade Analysis**
  - Total trades
  - Winning vs losing trades
  - Win/loss ratio
  - Period dates

### Integration with Calculator
- **Auto-Population**
  - Use backtest ROI for calculator
  - Pre-fill investment period (90 days)
  - Set principal amount
  - Immediate projection

- **Use Case**
  - "If this ROI continues, what's my year projection?"
  - Tax impact on historical returns
  - Different principal amounts
  - Portfolio sizing

### Empty State
- Link to backtest page if no results
- Encourages users to create backtests
- Navigation to calculator

## 🎨 G5: Calculator UI Polish

### Responsive Design
- **Desktop** (≥1024px)
  - 3-column layout
  - All inputs visible at once
  - Charts full size

- **Tablet** (768px-1024px)
  - 2-column layout
  - Scrollable input panel
  - Charts below

- **Mobile** (<768px)
  - Single column
  - Vertical scrolling
  - Touch-friendly sliders
  - Full-width inputs

### Input Components
- **Sliders**
  - Smooth, responsive
  - Real-time calculation
  - Visual range indicators

- **Number Inputs**
  - Keyboard input alternative
  - Min/max validation
  - Currency formatting

- **Dropdowns**
  - Tax bracket selector
  - Scrollable on mobile
  - Selected value display

- **Radio Buttons**
  - Compound vs simple choice
  - Clear labeling
  - Accessibility compliant

### Animation & Transitions
- Page entrance animations (bottom-fade)
- Staggered component reveals
- Hover effects on cards
- Smooth state changes

### Dashboard Navigation
- **Desktop Header**
  - Horizontal nav with labels
  - Active page highlighting
  - Icon + text for clarity

- **Mobile Header**
  - Icon-only nav (space efficient)
  - Tooltip on hover/long-press
  - Scrollable if many items

### Comparison Table Polish
- Alternating row colors
- Hover highlighting
- Right-aligned numbers
- Monospace for data
- Color-coded columns

## 📤 G6: Save & Share Calculations

### Save Functionality
- **Database Storage**
  - Auto-save after calculation
  - One-click save button
  - Save confirmation message
  - Calculation appears in history

- **Calculation History Page**
  - List all saved calculations
  - Sort by date (newest first)
  - Quick stats on each row
  - Delete option

### Share Features
- **Shareable Links**
  - Generate public read-only URL
  - Copy to clipboard
  - QR code support (future)
  - Expiring links (future)

- **Share Dialog**
  - Copy link button
  - Copy results as text
  - Email share integration
  - PDF/text export
  - Visual feedback on copy

- **Shared Calculation View**
  - Read-only presentation
  - Professional formatting
  - Investment disclaimer
  - Create own calculation button
  - Copy to clipboard option

### Export Options
- **Text Format**
  - Copy to clipboard
  - Newline-separated values
  - Includes input parameters

- **PDF Export** (Stub for future library)
  - Professional PDF layout
  - Include charts
  - Formatted currency
  - Watermark with Signalight branding

- **CSV Export**
  - From calculation history page
  - Bulk download
  - Spreadsheet-compatible
  - Date-stamped filename

- **Email Share**
  - mailto: integration
  - Pre-filled subject line
  - Results in body
  - Share link included

## 🚀 G7: UI Polish & Deployment

### Loading States
- Skeleton loaders for data fetching
- Spinner animations
- Estimated load times
- Optimistic updates

### Error Handling
- User-friendly error messages
- Error recovery options
- Support contact information
- Error logging to backend

### Accessibility
- ARIA labels on all inputs
- Keyboard navigation support
- Color contrast compliance
- Focus indicators
- Screen reader support

### Performance Optimization
- Code splitting
- Image optimization
- Lazy loading
- Caching strategies
- Database query optimization

### Deployment Configuration
- Environment variables setup
- Vercel auto-deployment
- Railway backend hosting
- Database initialization
- Security checklist

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Analytics integration
- Uptime monitoring
- User behavior tracking

### Documentation
- Deployment guide (DEPLOYMENT.md)
- API documentation
- User guide
- Admin guide
- Troubleshooting guide

## 💳 Pricing Tiers

### Guest (Free)
- Full feature access
- 100 signals/month
- 1 backtest allowed
- 1,000 API calls
- No data persistence
- Perfect for testing

### Pro ($9.99/month)
- Unlimited signals
- Unlimited backtests
- 100,000 API calls
- All features included
- Data persistence
- Email support

### Pro+ ($29.99/month)
- Everything in Pro
- Unlimited API calls
- Priority support
- Custom reports
- API access
- Webhook support

## 🔒 Security Features

- JWT token-based authentication
- Secure password hashing
- CORS protection
- Rate limiting (ready)
- Input validation
- SQL injection prevention
- XSS protection
- CSRF tokens (ready)

## 📊 Analytics & Insights

- Calculation frequency per user
- Popular ROI ranges
- Tax bracket preferences
- Feature usage metrics
- User engagement tracking
- Retention analysis

## 🎯 Commercial Positioning

### Value Propositions
- Personal investment planning tool
- Tax-aware return projections
- Evidence-based signal confidence
- Professional-grade analytics
- Investor-ready reports

### Target Users
- Retail stock traders
- ETF investors
- Financial advisors
- Portfolio managers
- Investment enthusiasts

### Marketing Angles
- "Calculate your returns with taxes"
- "Signal-based profit projections"
- "Professional investment planning"
- "Tax-efficient portfolio analysis"

## 📝 API Reference

### Authentication
```
POST /auth/signup
POST /auth/login
POST /auth/guest
POST /auth/google
GET /auth/verify
```

### User Management
```
GET /api/user/{user_id}
POST /api/user/{user_id}/preferences
GET /api/user/{user_id}/calculations
```

### Calculator
```
POST /api/calculate
GET /api/user/{user_id}/calculations
```

## 🔄 Next Phase Ideas

- Webhook integrations
- Real-time signal trading
- Portfolio tracking
- Risk analysis
- Monte Carlo simulations
- Machine learning predictions
- Mobile app (React Native)
- Advanced charting
- Institutional features

## 📞 Support

For questions or issues:
1. Check DEPLOYMENT.md for setup
2. Review API documentation
3. Check error logs
4. Contact support team
