/**
 * Legal Content Module
 * 
 * Contains content for privacy policy, terms & conditions, disclaimer, about us, and contact us pages.
 * These are displayed in modal panels accessed from the footer.
 */

const LEGAL_CONTENT = {
    privacy: {
        title: 'Privacy Policy',
        content: `
            <div class="legal-section">
                <h3>1. Information We Collect</h3>
                <p>SmartFin collects information you provide directly, including:</p>
                <ul>
                    <li><strong>Account Information:</strong> Name, email address, and location when you create an account</li>
                    <li><strong>Financial Data:</strong> Account balances, income, expenses, investments, insurance, goals, and other financial information you enter</li>
                    <li><strong>Usage Data:</strong> App usage patterns, feature interactions, and technical diagnostics</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>2. How We Use Your Information</h3>
                <p>We use your information to:</p>
                <ul>
                    <li>Provide and improve our financial planning services</li>
                    <li>Sync your data across devices using Firebase</li>
                    <li>Send important notifications about your account</li>
                    <li>Respond to your support requests and bug reports</li>
                    <li>Analyze usage patterns to improve the app</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>3. Data Storage & Security</h3>
                <p>Your data is stored securely using Firebase Firestore, which provides:</p>
                <ul>
                    <li>Encryption in transit and at rest</li>
                    <li>Secure authentication via Firebase Auth</li>
                    <li>Regular security updates and monitoring</li>
                </ul>
                <p>We never sell your personal or financial data to third parties.</p>
            </div>
            
            <div class="legal-section">
                <h3>4. Data Retention</h3>
                <p>Your data is retained as long as your account is active. You can delete your account and all associated data at any time through the app settings.</p>
            </div>
            
            <div class="legal-section">
                <h3>5. Your Rights</h3>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Delete your account and data</li>
                    <li>Export your data</li>
                    <li>Opt out of data collection (though this may limit app functionality)</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>6. Third-Party Services</h3>
                <p>We use the following third-party services:</p>
                <ul>
                    <li><strong>Firebase:</strong> For authentication, database, and sync services</li>
                    <li><strong>EmailJS:</strong> For sending bug reports and dashboard reports</li>
                    <li><strong>Chart.js:</strong> For rendering financial charts</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>7. Contact Us</h3>
                <p>For privacy-related questions, contact us at: <a href="mailto:mrunaltemp01@gmail.com">mrunaltemp01@gmail.com</a></p>
            </div>
            
            <div class="legal-section">
                <p class="legal-updated">Last updated: August 2026</p>
            </div>
        `
    },
    
    terms: {
        title: 'Terms & Conditions',
        content: `
            <div class="legal-section">
                <h3>1. Acceptance of Terms</h3>
                <p>By using SmartFin, you agree to these Terms & Conditions. If you do not agree, please do not use the app.</p>
            </div>
            
            <div class="legal-section">
                <h3>2. Account Responsibilities</h3>
                <p>You are responsible for:</p>
                <ul>
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Providing accurate and complete information</li>
                    <li>Notifying us immediately of any unauthorized access</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>3. Service Description</h3>
                <p>SmartFin is a personal finance planning tool that helps you:</p>
                <ul>
                    <li>Track income, expenses, and investments</li>
                    <li>Plan budgets and financial goals</li>
                    <li>Monitor insurance coverage and tax planning</li>
                    <li>Analyze your financial health</li>
                </ul>
                <p>The app is provided for informational purposes only and does not constitute financial advice.</p>
            </div>
            
            <div class="legal-section">
                <h3>4. User Conduct</h3>
                <p>You agree not to:</p>
                <ul>
                    <li>Use the app for illegal purposes</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with the app operation or security</li>
                    <li>Submit false or misleading bug reports</li>
                    <li>Use automated tools to abuse the service</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>5. Intellectual Property</h3>
                <p>SmartFin, including its design, code, and content, is owned by Mrunal Kanta Muduli and protected by intellectual property laws. You may not copy, modify, or distribute the app without permission.</p>
            </div>
            
            <div class="legal-section">
                <h3>6. Disclaimer of Warranties</h3>
                <p>SmartFin is provided "as is" without warranties of any kind. We do not guarantee:</p>
                <ul>
                    <li>Uninterrupted or error-free operation</li>
                    <li>Accuracy of financial calculations or recommendations</li>
                    <li>Compatibility with all devices or browsers</li>
                    <li>Security against all possible threats</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>7. Limitation of Liability</h3>
                <p>In no event shall SmartFin or its owner be liable for any indirect, incidental, special, or consequential damages arising from the use of this app.</p>
            </div>
            
            <div class="legal-section">
                <h3>8. Termination</h3>
                <p>We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion.</p>
            </div>
            
            <div class="legal-section">
                <h3>9. Changes to Terms</h3>
                <p>We may update these terms from time to time. Continued use of the app constitutes acceptance of any changes.</p>
            </div>
            
            <div class="legal-section">
                <p class="legal-updated">Last updated: August 2026</p>
            </div>
        `
    },
    
    disclaimer: {
        title: 'Disclaimer',
        content: `
            <div class="legal-section">
                <h3>General Disclaimer</h3>
                <p>SmartFin is a personal finance planning tool designed for informational and educational purposes only. The app does not provide professional financial, investment, tax, or legal advice.</p>
            </div>
            
            <div class="legal-section">
                <h3>Not Financial Advice</h3>
                <p>The calculations, recommendations, and insights provided by SmartFin are based on the information you input and general financial principles. They should not be considered as personalized financial advice. Consult with a qualified financial advisor before making important financial decisions.</p>
            </div>
            
            <div class="legal-section">
                <h3>Accuracy of Information</h3>
                <p>While we strive to provide accurate calculations and up-to-date information, we cannot guarantee the completeness or accuracy of all data. Financial markets, tax laws, and economic conditions change frequently.</p>
            </div>
            
            <div class="legal-section">
                <h3>Investment Risks</h3>
                <p>Any investment-related features or projections are for informational purposes only. All investments carry risk, and past performance is not indicative of future results. You are solely responsible for your investment decisions.</p>
            </div>
            
            <div class="legal-section">
                <h3>Tax Information</h3>
                <p>Tax planning features are based on current tax laws and are for estimation purposes only. Tax laws are subject to change and individual circumstances vary. Consult with a qualified tax professional for specific tax advice.</p>
            </div>
            
            <div class="legal-section">
                <h3>Insurance Coverage</h3>
                <p>Insurance analysis features provide general guidance based on common insurance principles. They do not constitute insurance advice or guarantee coverage. Consult with insurance professionals for personalized recommendations.</p>
            </div>
            
            <div class="legal-section">
                <h3>Data Security</h3>
                <p>While we implement security measures to protect your data, no method of electronic storage or transmission is completely secure. We cannot guarantee absolute security of your information.</p>
            </div>
            
            <div class="legal-section">
                <h3>Third-Party Services</h3>
                <p>SmartFin uses third-party services (Firebase, EmailJS, etc.) which have their own terms and privacy policies. We are not responsible for the practices or policies of these third parties.</p>
            </div>
            
            <div class="legal-section">
                <h3>No Warranty</h3>
                <p>SmartFin is provided "as is" without any warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
            </div>
            
            <div class="legal-section">
                <p class="legal-updated">Last updated: August 2026</p>
            </div>
        `
    },
    
    about: {
        title: 'About Us',
        content: `
            <div class="legal-section">
                <h3>About SmartFin</h3>
                <p>SmartFin is a comprehensive personal finance application designed to help individuals take control of their financial future. Built with modern web technologies and a focus on user experience, SmartFin provides powerful tools for financial planning, budgeting, and analysis.</p>
            </div>
            
            <div class="legal-section">
                <h3>Our Mission</h3>
                <p>To empower individuals with the tools and insights they need to make informed financial decisions, achieve their goals, and build long-term financial security.</p>
            </div>
            
            <div class="legal-section">
                <h3>Key Features</h3>
                <ul>
                    <li><strong>Comprehensive Dashboard:</strong> Complete overview of your financial health with real-time insights</li>
                    <li><strong>Budget Planning:</strong> Monthly budget management with variable expense tracking</li>
                    <li><strong>Investment Tracking:</strong> Monitor all investments with portfolio analysis</li>
                    <li><strong>Goal Setting:</strong> Set and track financial goals with progress monitoring</li>
                    <li><strong>Insurance Management:</strong> Track insurance policies and coverage analysis</li>
                    <li><strong>Tax Planning:</strong> Comprehensive tax planning with regime comparison</li>
                    <li><strong>Expense Tracking:</strong> Detailed expense categorization and analysis</li>
                    <li><strong>Cross-Device Sync:</strong> Real-time synchronization across all your devices</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>Technology Stack</h3>
                <p>SmartFin is built using modern web technologies:</p>
                <ul>
                    <li><strong>Frontend:</strong> Vanilla JavaScript with ES6 modules</li>
                    <li><strong>Backend:</strong> Firebase for authentication and real-time database</li>
                    <li><strong>Styling:</strong> Custom CSS with modern design principles</li>
                    <li><strong>Charts:</strong> Chart.js for data visualization</li>
                    <li><strong>Email:</strong> EmailJS for transactional emails</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>Privacy & Security</h3>
                <p>Your financial data is encrypted and stored securely using Firebase. We never sell your data to third parties. See our Privacy Policy for more details.</p>
            </div>
            
            <div class="legal-section">
                <h3>Developer</h3>
                <p>SmartFin is developed and maintained by Mrunal Kanta Muduli. The app is continuously improved based on user feedback and evolving financial needs.</p>
            </div>
            
            <div class="legal-section">
                <h3>Version</h3>
                <p>Current Version: <span id="aboutAppVersion">Loading...</span></p>
            </div>
            
            <div class="legal-section">
                <h3>Contact</h3>
                <p>For questions, feedback, or support: <a href="mailto:mrunaltemp01@gmail.com">mrunaltemp01@gmail.com</a></p>
            </div>
            
            <div class="legal-section">
                <p class="legal-updated">Last updated: August 2026</p>
            </div>
        `
    },
    
    contact: {
        title: 'Contact Us',
        content: `
            <div class="legal-section">
                <h3>Get in Touch</h3>
                <p>We would love to hear from you! Whether you have questions, feedback, bug reports, or feature requests, please reach out.</p>
            </div>
            
            <div class="legal-section">
                <h3>Email Support</h3>
                <p>For general inquiries, support, and feedback:</p>
                <p class="contact-email"><a href="mailto:mrunaltemp01@gmail.com">mrunaltemp01@gmail.com</a></p>
            </div>
            
            <div class="legal-section">
                <h3>Bug Reports</h3>
                <p>Found a bug? Use the built-in bug report feature in the app (Settings → Report a Bug) to automatically include system information and logs. This helps us diagnose and fix issues faster.</p>
            </div>
            
            <div class="legal-section">
                <h3>Feature Requests</h3>
                <p>Have an idea for improving SmartFin? We welcome feature requests! Email us with your suggestions, and we'll consider them for future updates.</p>
            </div>
            
            <div class="legal-section">
                <h3>Response Time</h3>
                <p>We typically respond to emails within 24-48 hours, excluding weekends and holidays. Bug reports are prioritized and may receive faster responses.</p>
            </div>
            
            <div class="legal-section">
                <h3>Information to Include</h3>
                <p>When contacting us, please include:</p>
                <ul>
                    <li>Your name and email address</li>
                    <li>A detailed description of your question or issue</li>
                    <li>Steps to reproduce any bugs</li>
                    <li>Screenshots if applicable</li>
                    <li>SmartFin version (found in Settings)</li>
                </ul>
            </div>
            
            <div class="legal-section">
                <h3>Privacy</h3>
                <p>Your contact information will only be used to respond to your inquiry and will not be shared with third parties. See our Privacy Policy for more details.</p>
            </div>
            
            <div class="legal-section">
                <h3>Social Media</h3>
                <p>Follow us for updates, tips, and financial insights:</p>
                <p class="contact-social">Coming soon!</p>
            </div>
            
            <div class="legal-section">
                <p class="legal-updated">Last updated: August 2026</p>
            </div>
        `
    }
};
