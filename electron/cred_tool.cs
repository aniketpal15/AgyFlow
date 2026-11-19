using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredTool {
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredWrite(ref CREDENTIAL credential, int flags);

    [DllImport("Advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredDelete(string target, int type, int flags);

    [DllImport("Advapi32.dll", SetLastError = true)]
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

    public static int Main(string[] args) {
        if (args.Length == 0) {
            Console.WriteLine("Usage: cred_tool.exe read [target]");
            return 1;
        }

        string action = args[0].ToLower();
        string target = args.Length > 1 ? args[1] : "gemini:antigravity";

        if (action == "read") {
            IntPtr ptr;
            if (CredRead(target, 1, 0, out ptr)) {
                var cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
                if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero) {
                    byte[] bytes = new byte[cred.CredentialBlobSize];
                    Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
                    Console.Write(Encoding.UTF8.GetString(bytes));
                }
                CredFree(ptr);
                return 0;
            } else {
                return 2; // Not found
            }
        }
        else if (action == "write" && args.Length > 2) {
            string secret = args[2];
            byte[] bytes = Encoding.UTF8.GetBytes(secret);
            IntPtr blobPtr = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, blobPtr, bytes.Length);

            var cred = new CREDENTIAL {
                Type = 1, // GENERIC
                TargetName = target,
                CredentialBlobSize = bytes.Length,
                CredentialBlob = blobPtr,
                Persist = 2, // LOCAL_MACHINE
                UserName = "antigravity"
            };

            bool ok = CredWrite(ref cred, 0);
            Marshal.FreeHGlobal(blobPtr);
            return ok ? 0 : 3;
        }

        return 1;
    }
}

