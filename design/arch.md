System Architecture Documentation
Attendance & Workforce Management System (On-Premise)
1. System Overview
The system is designed to manage staff attendance, biometric authentication, roster management, payroll calculation, compliance monitoring, and reporting for the farm environment. The system is deployed on-premise due to unreliable internet connectivity, and all devices communicate over a local LAN/Wi-Fi network.
The architecture follows a layered architecture model to ensure security, scalability, maintainability, and proper separation of responsibilities.
The system consists of the following layers:
1.	User Layer
2.	Device Layer (Clock Station)
3.	Network Layer (LAN/Wi Fi)
4.	API Layer
5.	Application Layer
6.	Database Layer
7.	Backup and Recovery Layer

2. Layer-by-Layer Architecture Description
Layer 1 – Users
Users include:
1.	Farm Staff
2.	Admin/Supervisor
3.	Payroll Managers
4.	System Administrators
Responsibilities:
1.	Staff clock in/out and take breaks
2.	Admin manages staff, roster, and attendance adjustments
3.	Payroll managers generate payroll
4.	Admin generates reports and compliance checks
This layer does not interact directly with the database or services.
Users interact through Clock Stations or Admin Interface.

Layer 2 – Device Layer (Clock Stations)
Devices include:
•	Fingerprint scanner 
•	Passcode input 
•	Touch screen terminal 
•	Small embedded computer 
•	Network connection (LAN/Wi-Fi) 
Responsibilities:
•	Capture fingerprint or passcode 
•	Capture check-in / check-out / break events 
•	Send requests to the system through network 
•	Display system responses (success, error, invalid fingerprint) 
•	Temporarily store data if network is down (offline mode)
Important:
Clock stations do NOT process biometric matching and do NOT store permanent records.
They only capture and send data.

Layer 3 – Network Layer (LAN / Wi-Fi)
Purpose:
The network layer connects all devices and servers in the system.
Connects:
•	Clock Stations 
•	Application Server 
•	Database Server 
•	Admin Computers 
Responsibilities:
•	Transfer requests from devices to API server 
•	Transfer responses back to devices 
•	Allow communication between services and database 
•	Enable on-premise system operation without internet 
Important Design Feature:
If the network is temporarily unavailable:
•	Clock stations should store attendance locally 
•	When network returns, stored data is sent to server
This is called Offline Buffering / Store-and-Forward. 
 
Layer 4 – API Layer
Purpose:
The API Layer acts as the controlled entry point to the backend system.
Responsibilities:
•	Receive requests from clock stations and admin systems 
•	Validate request format and data 
•	Authenticate devices and users 
•	Route requests to appropriate application services 
•	Return responses to devices or admin systems 
•	Enforce security and access control 
API does NOT:
•	Perform biometric matching 
•	Calculate payroll 
•	Generate reports 
•	Store data in database


Summary:
API Layer = Receive → Validate → Route → Respond





Layer 5 – Application Service Layer
This is the core logic layer of the system.
Services may include:
•	Biometric Matching Service 
•	Time Capture Service 
•	Staff Management Service 
•	Roster Service 
•	Payroll Service 
•	Compliance Service 
•	Reporting Service 
•	Admin Service 
Responsibilities:
•	Match fingerprint with biometric templates 
•	Record attendance and break times 
•	Manage staff information 
•	Manage roster schedules 
•	Calculate payroll 
•	Check compliance rules (e.g., breaks, overtime) 
•	Generate reports 
•	Handle admin actions 
•	Interact with database 
This layer contains all business logic.
 
Layer 6 – Database Layer
Database stores:
•	Staff information 
•	Biometric templates (fingerprint data) 
•	Roster schedules 
•	Attendance records 
•	Break records 
•	Payroll data 
•	Compliance rule configuration data (overtime, break, penalty, Fair Work thresholds)
•	Compliance records 
•	Audit logs 
•	System logs 
Responsibilities:
•	Store system data permanently 
•	Provide data for biometric matching 
•	Provide data for payroll calculation 
•	Provide data for reports 
•	Maintain audit trail for manual changes 
Important:
Only Application Services should communicate with the database.
Devices and API should not directly access database.

Compliance Rule Configuration (Sprint Review 2 Note):
Compliance and payroll thresholds are NOT hardcoded in application logic.
The `COMPLIANCE_RULE` table stores overtime, break, penalty, and Fair Work-related thresholds as configurable records.
Rules are versioned with `effective_from` and `effective_to`, so legal/policy changes can be applied by data update (not code redesign), while preserving historical payroll accuracy and compliance traceability.
 
Layer 7 – Backup & Recovery Layer
Purpose:
Protect system data in case of:
•	Server failure 
•	Database corruption 
•	Hardware failure 
•	Accidental data deletion 
•	System crash 
Responsibilities:
•	Periodically back up database 
•	Store backup copies securely 
•	Allow system restoration from backup 
•	Ensure data recovery after failure 
This layer ensures data safety and system reliability.
3. System Data Flow (Very Important Section)
Attendance Flow
Staff → Clock Station → Network → API → Biometric Service → Time Capture Service → Database → Backup → Response → Clock Station
Admin Flow
Admin → Admin Interface → Network → API → Staff/Roster Service → Database → Backup → Response → Admin Interface
Payroll Flow
Payroll Service → Database → Payroll Calculation → Database → Backup → Reports
Reporting Flow
Reporting Service → Database → Generate Report → Admin

4. Architecture Principle Used
This system uses:
•	Layered Architecture 
•	Client-Server Architecture 
•	On-Premise Deployment Architecture 
•	Service-Oriented Architecture (conceptually) 
•	Secure Access Through API Gateway 
•	Offline-Capable System Design 

Summary:
The system follows a layered on-premise architecture where clock station devices capture attendance data and communicate through the LAN/Wi-Fi network to the API layer. The API layer validates and routes requests to the application service layer, where biometric authentication, attendance recording, payroll calculation, and reporting logic are processed. The processed data is stored in the database server, and backup and recovery mechanisms ensure data safety and system reliability. The layered architecture improves system security, maintainability, scalability, and reliability.



If anyone has any question regarding their role. Please feel free to ask me.
