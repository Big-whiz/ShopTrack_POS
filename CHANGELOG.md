# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-10

### Added
- **Supplier Debt Tracker**: Dedicated module to track vendor information, debts incurred, and payments made.
- **Mark as Paid**: New action to settle outstanding debts with one click, automatically updating payment dates.
- **Auto-Print Configuration**: Global setting to enable or disable automatic thermal receipt printing after transactions.
- **CSV Data Export**: Restored and enhanced CSV export functionality across Sales History, Analytics, and Supplier Debts.
- **Logo Navigation**: Tapping the "ShopTrack" logo now correctly redirects users back to the dashboard.

### Fixed
- **Summary Overflow**: Fixed numerical calculation errors that caused summary card numbers to concatenate instead of summing.
- **Dark Mode Visibility**: Fixed styling for export buttons that were invisible in dark mode.
- **Credit Sales UI**: Implemented foldable item lists in Credit Records to prevent table overflow.
- **Backend Security**: Resolved critical `ImportError` in security module.
- **Data Loading**: Improved eager loading in backend to ensure supplier names show up correctly in debt records.

## [1.0.0] - 2026-03-01
- Initial release of ShopTrack POS.
- Core POS, Inventory, Analytics, and Credit Sales modules.
- Dockerized deployment with Nginx and PostgreSQL.
