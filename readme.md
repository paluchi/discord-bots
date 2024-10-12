# Monorepo Project

This monorepo allows you to:

- Code almost anything required for your project on Node.js.
- Deploy to Firebase via CLI relative to the environment where you want to
  deploy.
- Implement clean architecture.
- Enable development with hot reloading for both back and front end in
  conjunction with the Firebase Emulator Suite.
- Provide flexibility to cover any need.

## Features

- **Node.js Development**: Easily develop various project requirements using
  Node.js.
- **Firebase Deployment**: Deploy your project to Firebase using the CLI,
  customized for different environments.
- **Clean Architecture**: Follow clean architecture principles for a
  well-structured and maintainable codebase.
- **Hot Reloading**: Enable hot reloading for both backend and frontend
  development, ensuring seamless integration with Firebase Emulator Suite.
- **Flexibility**: Designed to be flexible and adaptable to meet any project
  needs.

  ## Run dockerfile

  docker build --platform linux/amd64 -t <dockerhub_username>/<project>_<bot_name>:<version> -f apps/platform/dockerfiles/<project>/Dockerfile.<bot_name> .
  <!-- docker build --platform linux/amd64 -t gonzandrelli3410/bring-tech_onboarding:1.0.6 -f apps/platform/dockerfiles/bring-tech/Dockerfile.onboarding . -->
  <!-- docker build --platform linux/amd64 -t gonzandrelli3410/bring-tech_tickets:1.0.1 -f apps/platform/dockerfiles/bring-tech/Dockerfile.tickets . -->
  <!-- docker build --platform linux/amd64 -t gonzandrelli3410/bring-tech_backoffice:1.0.1 -f apps/platform/dockerfiles/bring-tech/Dockerfile.backoffice . -->

  <!-- docker build --platform linux/amd64 -t gonzandrelli3410/onboarding:1.1 -f apps/platform/dockerfiles/Dockerfile.onboarding . -->
  <!-- docker tag 5cea2b72cf03 gonzandrelli3410/onboarding:1.1  -->
  <!-- docker push gonzandrelli3410/onboarding:1.1 -->



  docker run -d --name <bot_name> <image_id>

  to upload:
  docker tag <image_id> <dockerhub_username>/<project>_<bot_name>:<version>
  <!-- docker tag 010ebea561aa gonzandrelli3410/bring-tech_onboarding:1.0.6 -->
  <!-- docker tag 099603cba7dc gonzandrelli3410/bring-tech_tickets:1.0.1 -->
  <!-- docker tag 010ebea561aa gonzandrelli3410/bring-tech_backoffice:1.0.1 -->
  docker push <dockerhub_username>/<project>_<bot_name>:<version>
  <!-- docker push gonzandrelli3410/bring-tech_onboarding:1.0.6 -->
  <!-- docker push gonzandrelli3410/bring-tech_tickets:1.0 -->
  <!-- docker push gonzandrelli3410/bring-tech_backoffice:1.0 -->




<!-- docker build --platform linux/amd64 -t gonzandrelli3410/gold-hash_onboarding:1.0.9 -f apps/platform/dockerfiles/gold-hash/Dockerfile.onboarding . -->
<!-- docker build --platform linux/amd64 -t gonzandrelli3410/gold-hash_tickets:1.0.5 -f apps/platform/dockerfiles/gold-hash/Dockerfile.tickets . -->
<!-- docker build --platform linux/amd64 -t gonzandrelli3410/gold-hash_backoffice:1.0.2 -f apps/platform/dockerfiles/gold-hash/Dockerfile.backoffice . -->

<!-- docker tag 2e459add993c gonzandrelli3410/gold-hash_onboarding:1.0.9 -->
<!-- docker tag ec8399c95a8d gonzandrelli3410/gold-hash_tickets:1.0.5 -->
<!-- docker tag db3634ccb5ee gonzandrelli3410/gold-hash_backoffice:1.0.2 -->

<!-- docker push gonzandrelli3410/gold-hash_onboarding:1.0.9 -->
<!-- docker push gonzandrelli3410/gold-hash_tickets:1.0.5 -->
<!-- docker push gonzandrelli3410/gold-hash_backoffice:1.0.2 -->