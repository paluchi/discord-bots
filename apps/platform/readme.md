// cors-config.md is to let local dev server to access the storage bucket

// # Authenticate with gcloud // gcloud auth login

// # Set the correct project // gcloud config set project YOUR_PROJECT_ID

// # Set the CORS configuration

// gsutil cors set cors-config.json gs://adults-site-dev.appspot.com
<!-- RUN THE ABOVE ALL THE BUCKETS -->
