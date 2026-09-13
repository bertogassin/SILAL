pragma SPARK_Mode (On);

package body Hashing is
   function Chain_Ok (Prev, Current : Digest; Linked_Prev : Digest) return Boolean is
      pragma Unreferenced (Current);
   begin
      return Prev = Linked_Prev;
   end Chain_Ok;
end Hashing;
