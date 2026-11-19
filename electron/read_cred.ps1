$csharp = @"
using System;
using System.Runtime.InteropServices;
public class CredReader {
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr cred);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    public static string ReadUtf8(string target) {
        IntPtr ptr;
        if (CredRead(target, 1, 0, out ptr)) {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            CredFree(ptr);
            return System.Text.Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
"@
Add-Type -TypeDefinition $csharp
$target = if ($args.Count -gt 0) { $args[0] } else { "gemini:antigravity" }
[CredReader]::ReadUtf8($target)

