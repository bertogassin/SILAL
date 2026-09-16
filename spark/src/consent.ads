pragma SPARK_Mode (On);

package Consent is
   --  A living person is not published to others without a consent flag.
   function May_Publish (Living : Boolean; Consented : Boolean) return Boolean
     with Post => May_Publish'Result = ((not Living) or Consented);
end Consent;
