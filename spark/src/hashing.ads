pragma SPARK_Mode (On);

package Hashing is
   type Digest is mod 2 ** 64;

   --  Placeholder contract: a blob's digest is stable; swapping bytes
   --  without updating the chain is rejected by the rust archive crate.
   function Chain_Ok (Prev, Current : Digest; Linked_Prev : Digest) return Boolean
     with Post => Chain_Ok'Result = (Prev = Linked_Prev);
end Hashing;
