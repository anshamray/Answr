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
        <h1 class="text-4xl font-bold mb-2">Terms of Service</h1>
        <p class="text-muted-foreground mb-8">Last updated: February 2025</p>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p class="text-muted-foreground mb-4">
            By accessing or using Answr ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">2. Description of Service</h2>
          <p class="text-muted-foreground mb-4">
            Answr is an open-source quiz platform that allows users to create, host, and participate in
            interactive quizzes. The Service includes:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Creating and managing quiz content</li>
            <li>Hosting real-time quiz sessions</li>
            <li>Participating in quizzes as a player</li>
            <li>Accessing the public quiz library</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">3. User Accounts</h2>
          <p class="text-muted-foreground mb-4">
            To access certain features, you may need to create an account. You are responsible for:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Providing accurate and complete information</li>
            <li>Notifying us of any unauthorized access to your account</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">4. User Content</h2>
          <p class="text-muted-foreground mb-4">
            You retain ownership of any quizzes and content you create. By publishing content to the
            public library, you grant other users the right to view, play, and clone your quizzes.
          </p>
          <p class="text-muted-foreground mb-4">
            You agree not to create or share content that:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Is illegal, harmful, or offensive</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains malware or harmful code</li>
            <li>Violates the privacy of others</li>
            <li>Is spam or misleading</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">5. Acceptable Use</h2>
          <p class="text-muted-foreground mb-4">
            You agree to use the Service only for lawful purposes and in accordance with these Terms.
            You agree not to:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use the Service to harm others</li>
            <li>Automate access to the Service without permission</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">6. Intellectual Property</h2>
          <p class="text-muted-foreground mb-4">
            The Service, including its design, features, and code, is protected by copyright and other
            intellectual property laws. Answr is open-source software, and its source code is available
            under the applicable open-source license.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">7. Disclaimer of Warranties</h2>
          <p class="text-muted-foreground mb-4">
            The Service is provided "as is" without warranties of any kind, either express or implied.
            We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
          <p class="text-muted-foreground mb-4">
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">9. Termination</h2>
          <p class="text-muted-foreground mb-4">
            We reserve the right to suspend or terminate your access to the Service at any time for
            violation of these Terms or for any other reason at our discretion. You may also delete
            your account at any time.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">10. Changes to Terms</h2>
          <p class="text-muted-foreground mb-4">
            We may update these Terms from time to time. We will notify you of any significant changes
            by posting the new Terms on this page. Your continued use of the Service after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-bold mb-4">11. Contact</h2>
          <p class="text-muted-foreground mb-4">
            If you have any questions about these Terms, please contact us through our GitHub repository.
          </p>
        </section>
      </article>
    </main>
  </div>
</template>
