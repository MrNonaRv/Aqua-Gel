The following were the minimum software and hardware specifications for the system:

1. Hardware Specifications (Typical Web Server Environment for Deployment):
2. Processor: Multi-core CPU (e.g., standard cloud instance CPU)
3. RAM: Minimum 4GB (scalable based on traffic)
4. Storage: 50GB SSD (for application hosting and fast loading)
5. Network Interface: High-speed Ethernet for internet connectivity
6. Software Specifications:
7. Operating System: Linux Distribution (e.g., Ubuntu Server, Alpine for containers)
8. Web Server: Nginx (to serve the built React files) or Node.js environment
9. Database / State Management: Client-Side Local Storage integrated with React Context API (Prototype data storage)
10. Frontend Technologies: TypeScript, HTML5, Tailwind CSS, React, Framer Motion (for UI animations), Recharts (for data visualization)
11. Development Environment: Visual Studio Code, Git, Vite configuration builder
12. Payment Gateway Integration: API for secure digital payments and unpaid balance settlements (e.g., GCash API, PayMongo - specific choice to be finalized during coding)
13. Deployment Environment: Vercel (Configured with `vercel.json` for React Client-Side Routing)
14. Customer Loyalty System: Automatic progress tracking towards a 50-gallon goal, awarding "Loyal/Regular" status and displaying a star icon.

Coding Phase
The coding phase involved the development of the source code for the client-facing interface (Customer Portal) and the administrative dashboard (Admin Portal) of the Aqua Gel Water Station Management System.
The chosen programming language and framework (TypeScript with React) were utilized to implement the system’s functionality. The frontend was developed using modern web technologies and styled with Tailwind CSS to provide an intuitive and responsive user interface for placing water gallon orders, tracking deliveries, and managing inventory.
This included the implementation of interfaces for the role-based login system (separating customer and admin access), the interactive gallon selection and checkout process, the delivery tracking Kanban board, and the dynamic income charts.
On the data management side, modular state logic was developed for managing client accounts, processing order requests, handling inventory tracking for Slim and Round gallons, and securely persisting data within the browser. Data integration was crucial for efficient storage and retrieval of order details, tracking customer unpaid balances, and managing real-time inventory availability. An analytics module was implemented using Recharts to visually represent daily, weekly, and monthly income reports.
Furthermore, the application implemented specific logic for automatically adjusting unpaid balances when orders are placed or marked as paid, tracking individual container returns, and delivering fluid animations via Framer Motion. The code was structured into logical, reusable components, ensuring maintainability, scalability, and robust error handling throughout the application.

Testing Phase
Initial Testing. In this phase, the development team conducted a preliminary evaluation of the system to verify its core functionality and accuracy.
The evaluation examined whether the system could correctly: manage online water delivery orders (create, track, update statuses), correctly monitor customer unpaid balances and loyalty tiers, accurately deduct inventory upon order placement, and properly log stock adjustments.
This also included testing the functionality of the separate access portals, the proper display of delivery assignments to personnel, the validation of required fields during account creation, and the precision of the generated income charts.
This phase aimed to identify and rectify any critical bugs, layout issues, or logical errors in state management before proceeding to user acceptance testing. After the test, several UI animations and state adjustments were refined to enhance the system's reliability, usability, and data integrity.

Final Testing. In this phase, the developers determined the system’s acceptability by conducting a user evaluation based on ISO 25010 software quality standards. The final testing was carried out involving key stakeholders associated with the water station (administrators and staff) and a selection of potential customers. To assess the effectiveness and usability of the water station management system, guided testing sessions were conducted. The evaluation focused on key criteria such as functional suitability (completeness, correctness), usability (learnability, operability, user error protection, user interface aesthetics), reliability (maturity, fault tolerance), and performance efficiency (time behavior, resource utilization).
Specific attention was paid to the seamless operation of placing standard and delivery orders, the responsiveness of the interface, the intuitive nature of the admin delivery tracking process, the clarity of the unpaid balance ledgers, and the effectiveness of the inventory management screens. The survey responses and observations from testing sessions helped validate the system’s practical application in a real-world water refilling station context and its alignment with user expectations.

---

### Recommended System Upgrades & Future Updates
To ensure the system scales efficiently alongside the growth of the business, the following updates and expansions are recommended for future iterations:

1. Distributed Backend Architecture & Cloud Database Integration
   - **Upgrade:** Transition data storage from LocalStorage (prototype environment) to a robust, transactional cloud database (e.g., Google Firebase/Firestore, PostgreSQL via Supabase, or a dedicated Node.js/Express backend).
   - **Reason:** This ensures data access across multiple devices simultaneously, improves data security, and prevents data loss if a user clears their browser cache.

2. Secure Authentication & Identity Verification
   - **Upgrade:** Implement encrypted password hashing (e.g., bcrypt), JWT (JSON Web Tokens) or OAuth 2.0 (Google/Facebook Login), and multi-factor authentication (MFA) for the administrative panel.
   - **Reason:** Protects sensitive customer data, ensures compliance with data privacy standards, and improves the user onboarding experience.

3. Online Payment Gateway Integration
   - **Upgrade:** Integrate APIs like PayMongo, GCash API, Maya, or Stripe to allow customers to pay for their orders digitally inside the customer portal.
   - **Reason:** Reduces the friction of cash-on-delivery, enforces strict accountability, and automatically updates the "Paid/Unpaid" balance without manual admin intervention.

4. Real-time Notifications & Delivery Tracking
   - **Upgrade:** Integrate automated SMS notifications (via Twilio or local gateways) or email alerts (via SendGrid) to notify clients when their order is "Out for Delivery" or "Delivered". Combine this with real-time GPS tracking for delivery riders using mapping APIs (Google Maps or Mapbox).
   - **Reason:** Significantly enhances the customer experience by providing visibility into their water delivery, minimizing wait-time uncertainty.

5. Subscription & Recurring Orders Module
   - **Upgrade:** Add a feature allowing loyal customers to set up automatically recurring orders (e.g., "deliver 2 round gallons every Monday").
   - **Reason:** Promotes steady revenue, reduces the cognitive load on the customer, and helps the admin forecast inventory needs accurately.

6. Enhanced Analytics & Artificial Intelligence
   - **Upgrade:** Implement predictive analytics and an AI chatbot. The AI could forecast water demand based on weather patterns and past sales data, or automatically answer common customer queries regarding operating hours and delivery zones.
   - **Reason:** Empowers administration to optimize stock ordering and reduces customer service workload.