<script setup>
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <span class="text-xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
        <router-link to="/register" class="text-sm text-muted-foreground hover:text-primary transition">
          Back to Sign Up
        </router-link>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-12">
      <article class="prose prose-lg max-w-none">
        <h1 class="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p class="text-muted-foreground mb-8">Last updated: February 2025</p>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">1. Introduction</h2>
          <p class="text-muted-foreground mb-4">
            This Privacy Policy explains how Answr ("we", "us", "our") collects, uses, and protects
            your information when you use our quiz platform. We are committed to protecting your
            privacy and being transparent about our data practices.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">2. Information We Collect</h2>

          <h3 class="text-xl font-semibold mb-3">2.1 Account Information</h3>
          <p class="text-muted-foreground mb-4">
            When you create an account, we collect:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Your name</li>
            <li>Email address</li>
            <li>Password (stored securely using encryption)</li>
            <li>OAuth profile information (if you sign in with Google or GitHub)</li>
          </ul>

          <h3 class="text-xl font-semibold mb-3">2.2 Quiz and Session Data</h3>
          <p class="text-muted-foreground mb-4">
            When you use the Service, we collect:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Quizzes you create (questions, answers, settings)</li>
            <li>Session participation data (scores, answers, timestamps)</li>
            <li>Player names and avatars chosen during gameplay</li>
          </ul>

          <h3 class="text-xl font-semibold mb-3">2.3 Technical Information</h3>
          <p class="text-muted-foreground mb-4">
            We automatically collect:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Usage patterns and interactions with the Service</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
          <p class="text-muted-foreground mb-4">
            We use your information to:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Provide and maintain the Service</li>
            <li>Authenticate your identity and secure your account</li>
            <li>Enable quiz creation, hosting, and participation</li>
            <li>Display leaderboards and game results</li>
            <li>Send important account notifications (e.g., email verification)</li>
            <li>Improve and develop new features</li>
            <li>Prevent fraud and abuse</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">4. Information Sharing</h2>
          <p class="text-muted-foreground mb-4">
            We do not sell your personal information. We may share information in the following cases:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li><strong>Public quizzes:</strong> When you publish a quiz to the library, its content
                and your display name become visible to all users</li>
            <li><strong>Game sessions:</strong> Player names and scores are visible to other
                participants in the same session</li>
            <li><strong>Legal requirements:</strong> If required by law or to protect our rights</li>
            <li><strong>Service providers:</strong> Third-party services that help us operate
                (e.g., hosting, authentication providers)</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">5. Data Storage and Security</h2>
          <p class="text-muted-foreground mb-4">
            We implement appropriate security measures to protect your data, including:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Encryption of passwords and sensitive data</li>
            <li>Secure HTTPS connections</li>
            <li>Regular security updates</li>
            <li>Access controls and authentication</li>
          </ul>
          <p class="text-muted-foreground mb-4">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee
            absolute security.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">6. Your Rights</h2>
          <p class="text-muted-foreground mb-4">
            You have the right to:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Export:</strong> Download your quizzes and data</li>
            <li><strong>Withdraw consent:</strong> Opt out of optional data collection</li>
          </ul>
          <p class="text-muted-foreground mb-4">
            To exercise these rights, contact us through our GitHub repository or delete your account
            through the settings.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">7. Cookies and Local Storage</h2>
          <p class="text-muted-foreground mb-4">
            We use cookies and local storage to:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Store game session data during play</li>
          </ul>
          <p class="text-muted-foreground mb-4">
            These are essential for the Service to function and cannot be disabled while using Answr.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">8. Children's Privacy</h2>
          <p class="text-muted-foreground mb-4">
            The Service is intended for users of all ages. However, account creation requires parental
            consent for users under 13. Players can join quiz sessions without creating an account.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">9. Data Retention</h2>
          <p class="text-muted-foreground mb-4">
            We retain your data for as long as your account is active. Session data (player scores,
            answers) is retained for statistical purposes but can be deleted upon request.
            When you delete your account, your personal data is removed within 30 days.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">10. Changes to This Policy</h2>
          <p class="text-muted-foreground mb-4">
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">11. Contact Us</h2>
          <p class="text-muted-foreground mb-4">
            If you have questions about this Privacy Policy or your data, please contact us
            through our GitHub repository.
          </p>
        </section>
      </article>
    </main>
  </div>
</template>
