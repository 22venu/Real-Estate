# Meridian Estates

Responsive real-estate company website built with React, Vite, and Firebase. Public visitors do not need accounts. Staff use Firebase Authentication to access `/admin`.

## Run locally

```sh
npm install
Copy-Item .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web-app values from Firebase Console before testing login, property sync, lead forms, or image uploads. Without Firebase configuration, the public site uses sample property content and the admin login displays setup instructions.

## Firebase setup

1. Create a Firebase project and register a Web app. Copy the web configuration values into `.env.local` using the keys from `.env.example`.
2. In **Authentication → Sign-in method**, enable **Email/Password**. Create staff users from the Firebase Console; public self-registration is not provided.
3. Create a Cloud Firestore database. Publish the rules in `firestore.rules`.
4. In **Authentication → Users**, copy the staff user's UID. In Firestore, create `users/{UID}` with fields `email` (string), `name` (string), and `role` (string exactly `admin`). The document ID must exactly match the Authentication UID. Create or update this record from the Firebase Console.
5. In Cloudinary, create an **unsigned upload preset**. Add the Cloudinary cloud name and preset name to `.env.local` using `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`. Restrict the preset to images and a 10 MB file limit.
6. Open Admin → Site settings to edit the company name, office address, map URL, phone, email, and WhatsApp number. These values are stored in `site_settings/public` and displayed across the public site. The `VITE_COMPANY_*` variables are fallback defaults.
7. For each property, enter its full address and optional Google Maps embed URL in Admin → Properties. The map falls back to searching the address if no embed URL is supplied.
8. Start the site and sign in at `/admin/login`. Add a property and submit a public enquiry to verify that both are visible in their admin sections.

Firestore collections include `users`, `properties`, `site_settings`, `enquiries`, `call_requests`, and `site_visits`. Published properties use `status: "ACTIVE"`; unpublished properties use `INACTIVE`. Public visitors can read `site_settings/public` and active properties, and can create leads, but cannot read or edit customer requests. Admin access requires the signed-in user's `users/{UID}` document to have `role: "admin"`.

## Admin features

- Email/password staff login and role-based authorization through `users/{UID}`
- Dashboard totals for properties, enquiries, callback requests, and site visits
- Property add/edit/delete, publish/unpublish, Cloudinary image upload, address, Google Maps embed URL, and listing contact phone
- Searchable enquiry, callback, and site-visit lists with status updates and delete actions
- Admin-editable public company name, office location/map, phone, email, and WhatsApp contact
- Public forms write enquiries, callback requests, and site-visit requests to Firestore when Firebase is configured

Site visits are recorded as requests and are not confirmed appointments. Slot availability, capacity limits, and transaction-safe booking are not implemented yet. Review and customize Firestore rules for the final data model before deploying.

## Deployment

1. Push the project to GitHub.
2. Import the repository into Vercel; use the default Vite build command `npm run build` and output directory `dist`.
3. Add every `VITE_FIREBASE_*`, `VITE_CLOUDINARY_*`, and any `VITE_COMPANY_*` fallback values from `.env.example` in Vercel **Project Settings → Environment Variables** for the Production, Preview, and Development environments you use.
4. Deploy. In Firebase Authentication settings, add the deployed domain to **Authorized domains**.
5. Re-test `/admin/login`, public enquiry creation, property publishing, Cloudinary uploads, and both office/property maps on the deployed domain.
6. Add a custom domain in Vercel and verify DNS, HTTPS, Firebase authorized domains, and the production forms.

Do not commit `.env.local`. Firebase web configuration is used by the browser; Firestore Security Rules enforce database access. The Cloudinary upload preset is public for browser uploads, so configure it with upload limits and allowed formats. Never put Firebase service-account keys or Cloudinary API secrets in this frontend project.
