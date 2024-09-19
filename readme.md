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

  docker run -d --name <bot_name> <image_id>

  to upload:
  docker tag <image_id> <dockerhub_username>/<project>_<bot_name>:<version>
  <!-- docker tag 010ebea561aa gonzandrelli3410/bring-tech_onboarding:1.0.6 -->
  <!-- docker tag 010ebea561aa gonzandrelli3410/bring-tech_tickets:1.0.1 -->
  <!-- docker tag 010ebea561aa gonzandrelli3410/bring-tech_backoffice:1.0.1 -->
  docker push <dockerhub_username>/<project>_<bot_name>:<version>
  <!-- docker push gonzandrelli3410/bring-tech_onboarding:1.0.6 -->
  <!-- docker push gonzandrelli3410/bring-tech_tickets:1.0 -->
  <!-- docker push gonzandrelli3410/bring-tech_backoffice:1.0 -->

