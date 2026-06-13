export interface CommandGroup {
  tool: string;
  commands: { cmd: string; desc: string }[];
}

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    tool: "JADX",
    commands: [
      { cmd: "jadx app.apk -d out/", desc: "فك الـ APK إلى مجلد Java" },
      { cmd: "jadx-gui", desc: "فتح الواجهة الرسومية" },
      { cmd: "jadx --deobf app.apk", desc: "فك الـ APK مع محاولة استعادة الأسماء" },
      { cmd: "jadx -r app.apk", desc: "فك الـ APK بدون فك الـ Resources" },
    ],
  },
  {
    tool: "APKTool",
    commands: [
      { cmd: "apktool d app.apk", desc: "فك الـ APK إلى Smali و Resources" },
      { cmd: "apktool b folder -o new.apk", desc: "بناء APK جديد من المجلد المعدل" },
      { cmd: "apktool if framework.apk", desc: "تثبيت ملف Framework" },
    ],
  },
  {
    tool: "Frida",
    commands: [
      { cmd: "frida -U -f com.app -l script.js", desc: "تشغيل التطبيق وحقن سكربت" },
      { cmd: "frida-ps -Ua", desc: "عرض التطبيقات المشغلة على الجهاز" },
      { cmd: "frida-trace -U -i 'open' com.app", desc: "تتبع استدعاءات دالة معينة" },
      { cmd: "frida-ls-devices", desc: "عرض الأجهزة المتصلة" },
    ],
  },
  {
    tool: "ADB",
    commands: [
      { cmd: "adb devices", desc: "عرض الأجهزة المتصلة" },
      { cmd: "adb shell", desc: "الدخول إلى Terminal الجهاز" },
      { cmd: "adb logcat", desc: "عرض سجلات النظام" },
      { cmd: "adb install app.apk", desc: "تثبيت تطبيق" },
      { cmd: "adb push local /remote", desc: "نقل ملف للجهاز" },
      { cmd: "adb pull /remote local", desc: "سحب ملف من الجهاز" },
    ],
  },
  {
    tool: "objection",
    commands: [
      { cmd: "objection -g com.app explore", desc: "بدء استكشاف التطبيق" },
      { cmd: "android sslpinning disable", desc: "تعطيل SSL Pinning" },
      { cmd: "android root disable", desc: "تعطيل كشف الروت" },
      { cmd: "env", desc: "عرض بيئة عمل التطبيق" },
    ],
  },
  {
    tool: "Radare2",
    commands: [
      { cmd: "r2 -A lib.so", desc: "فتح ملف native للتحليل" },
      { cmd: "aaa", desc: "تحليل كل شيء" },
      { cmd: "afl", desc: "عرض قائمة الدوال" },
      { cmd: "pdf @ main", desc: "عرض ديسكود دالة" },
    ],
  },
];
