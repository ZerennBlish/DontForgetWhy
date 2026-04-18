[1mdiff --git a/src/screens/VoiceMemoDetailScreen.tsx b/src/screens/VoiceMemoDetailScreen.tsx[m
[1mindex 85fef15..2fc19a1 100644[m
[1m--- a/src/screens/VoiceMemoDetailScreen.tsx[m
[1m+++ b/src/screens/VoiceMemoDetailScreen.tsx[m
[36m@@ -272,11 +272,11 @@[m [mexport default function VoiceMemoDetailScreen({ navigation, route }: Props) {[m
         try { player.pause(); } catch { /* */ }[m
         Alert.alert([m
           'Unsaved changes',[m
[31m-          "You've made changes. Save before leaving?",[m
[32m+[m[32m          "You edited something and didn't save. Save it, ditch it, or stick around?",[m
           [[m
[31m-            { text: 'Cancel', style: 'cancel' },[m
[32m+[m[32m            { text: 'Stick around', style: 'cancel' },[m
             {[m
[31m-              text: 'Discard',[m
[32m+[m[32m              text: 'Ditch it',[m
               style: 'destructive',[m
               onPress: () => {[m
                 exitingRef.current = true;[m
[36m@@ -284,7 +284,7 @@[m [mexport default function VoiceMemoDetailScreen({ navigation, route }: Props) {[m
               },[m
             },[m
             {[m
[31m-              text: 'Save & Exit',[m
[32m+[m[32m              text: 'Save it',[m
               onPress: async () => {[m
                 const success = await handleSaveExisting();[m
                 if (success) {[m
[36m@@ -310,12 +310,12 @@[m [mexport default function VoiceMemoDetailScreen({ navigation, route }: Props) {[m
         e.preventDefault();[m
         try { player.pause(); } catch { /* */ }[m
         Alert.alert([m
[31m-          'Discard recording?',[m
[31m-          'No title or note yet. Toss the recording, or keep it as-is?',[m
[32m+[m[32m          'Unlabeled mystery?',[m
[32m+[m[32m          'You recorded a thing and gave it zero context. Keep the mystery or toss it?',[m
           [[m
             { text: 'Cancel', style: 'cancel' },[m
             {[m
[31m-              text: 'Discard',[m
[32m+[m[32m              text: 'Toss',[m
               style: 'destructive',[m
               onPress: async () => {[m
                 try {[m
[36m@@ -510,9 +510,9 @@[m [mexport default function VoiceMemoDetailScreen({ navigation, route }: Props) {[m
     const shouldDeleteMemo = isLastClip && memoOtherwiseEmpty;[m
 [m
     Alert.alert([m
[31m-      shouldDeleteMemo ? 'Delete this memo?' : 'Delete this clip?',[m
[32m+[m[32m      shouldDeleteMemo ? 'Goodbye, whole memo?' : 'Delete this clip?',[m
       shouldDeleteMemo[m
[31m-        ? 'This is the only clip and there\'s no title, note, or photos. Deleting it removes the memo entirely.'[m
[32m+[m[32m        ? 'Last clip, no title, no note. Nothing left to hold onto.'[m
         : 'This recording will be permanently removed.',[m
       [[m
         { text: 'Cancel', style: 'cancel' },[m
