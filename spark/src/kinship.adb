pragma SPARK_Mode (On);

package body Kinship is
   function Allowed_Kind (K : Edge_Kind) return Boolean is
      pragma Unreferenced (K);
   begin
      return True;
   end Allowed_Kind;

   function Would_Cycle (From, To : Person_Id) return Boolean is
   begin
      return From = To;
   end Would_Cycle;
end Kinship;
