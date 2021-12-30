    dependencies {
      // ...
      // Use this dependency to use dynamically downloaded model in Google Play Service
      implementation 'com.google.android.gms:play-services-mlkit-face-detection:16.2.1'
    }
        dependencies {
      // ...
      // Use this dependency to bundle the model with your app
      implementation 'com.google.mlkit:face-detection:16.1.3'
    }
    com.google.android16.2.1com.google16.1.3
