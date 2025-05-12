# Savant Energy Scenes Standalone Card

A custom Lovelace card for Home Assistant that provides an interface for managing Savant Energy scenes.

## Features

- View and manage Savant Energy scenes
- Create new scenes with custom names
- Edit existing scenes by toggling individual breakers/relays
- Delete unwanted scenes
- Simple and intuitive user interface

## Installation

### HACS (Recommended)

1. Make sure you have [HACS](https://hacs.xyz/) installed
2. Go to HACS → Frontend
3. Click the "+" button
4. Search for "Savant Energy Scenes Card"
5. Click "Install"
6. Refresh your browser

### Manual Installation

1. Download `savant-energy-scenes-card.js` from this repository
2. Copy the file to your `config/www` directory
3. Add the following to your `configuration.yaml` file:
   ```yaml
   lovelace:
     resources:
       - url: /local/savant-energy-scenes-card.js
         type: module
   ```
4. Restart Home Assistant

## Usage

Add the card to your dashboard:

1. Edit your dashboard
2. Click the "Add Card" button
3. Search for "Savant Energy Scenes Card"
4. Click on the card to add it

Or add it manually to your Lovelace configuration:

```yaml
type: custom:savant-energy-scenes-standalone-card
```

## Requirements

- Savant Energy integration must be installed and configured in Home Assistant
- Savant Energy devices must be properly set up and connected to Home Assistant

## Support

For issues, feature requests, or contributions, please use the GitHub repository.
