pragma SPARK_Mode (On);

package Kinship is
   type Person_Id is mod 2 ** 32;
   type Edge_Kind is (Parent, Child, Spouse, Adoptive);

   function Allowed_Kind (K : Edge_Kind) return Boolean
     with Post => Allowed_Kind'Result;

   --  Acyclicity of parent links is maintained by the rust/ada add_edge
   --  wrapper. SPARK proves the boolean check used at the FFI boundary.
   function Would_Cycle (From, To : Person_Id) return Boolean
     with Post => (if From = To then Would_Cycle'Result);
end Kinship;
