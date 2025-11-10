## ADDED Requirements

### Requirement: OpenKey-based Authentication
The browser extension SHALL obtain authentication tokens by calling the openKey API instead of accessing iframe sessionStorage data.

#### Scenario: Successful openKey retrieval
- **WHEN** user selects an iframe for authentication
- **AND** the openKey API returns a valid response
- **THEN** the system SHALL extract the openKey from the API response
- **AND** replace the existing openKey parameter in the iframe URL
- **AND** copy the updated URL to the clipboard

#### Scenario: OpenKey API failure
- **WHEN** the openKey API call fails or times out
- **THEN** the system SHALL display an appropriate error message
- **AND** provide retry options to the user
- **AND** maintain the original iframe URL for fallback

### Requirement: URL Parameter Replacement
The system SHALL parse iframe URLs and replace openKey parameters with values obtained from the API.

#### Scenario: URL with existing openKey
- **WHEN** an iframe URL contains an openKey parameter
- **AND** a new openKey is obtained from the API
- **THEN** the system SHALL replace the existing parameter value
- **AND** preserve all other URL parameters and structure

#### Scenario: URL without openKey parameter
- **WHEN** an iframe URL does not contain an openKey parameter
- **AND** a new openKey is obtained from the API
- **THEN** the system SHALL add the openKey parameter to the URL
- **AND** maintain proper URL formatting
