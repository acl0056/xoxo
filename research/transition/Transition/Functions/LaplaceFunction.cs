using Easycoustics.Transition.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.Functions
{
    public class LaplaceFunction : Function
    {
        public LaplaceExpression Expression { get; set; }
        
      
        public override ComplexDecimal Calculate(decimal f)
        {
            /* s = jw */
            return Expression.Evaluate(2 * DecimalMath.Pi * f * ComplexDecimal.ImaginaryOne);
        }

        public ComplexDecimal Calculate(ComplexDecimal point)
        {
            return Expression.Evaluate(point);
        }

        public override object Clone()
        {
            throw new NotImplementedException();
        }
    }


    public abstract class LaplaceExpression
    {
        public abstract ComplexDecimal Evaluate(ComplexDecimal point);
    }

    public class LaplaceConstant : LaplaceExpression
    {
        public ComplexDecimal ConstantValue;

        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            return ConstantValue;
        }
    }

    public class LaplaceLiteral : LaplaceExpression
    {
        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            return point;
        }
    }

    public class LaplaceProduct : LaplaceExpression
    {
        public List<LaplaceExpression> Expressions { get; } = new List<LaplaceExpression>();

        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            ComplexDecimal output = 1;
            foreach (var exp in Expressions)
                output *= exp.Evaluate(point);

            return output;
        }

        public LaplaceProduct(LaplaceExpression exp1, LaplaceExpression exp2)
        {
            Expressions.Add(exp1);
            Expressions.Add(exp2);
        }

        public LaplaceProduct(LaplaceExpression exp1, LaplaceExpression exp2, LaplaceExpression exp3)
        {
            Expressions.Add(exp1);
            Expressions.Add(exp2);
            Expressions.Add(exp3);
        }

    }

    public class LaplaceSum : LaplaceExpression
    {
        public List<LaplaceExpression> Expressions { get; } = new List<LaplaceExpression>();

        public LaplaceSum(LaplaceExpression exp1, LaplaceExpression exp2)
        {
            Expressions.Add(exp1);
            Expressions.Add(exp2);
        }

        public LaplaceSum(LaplaceExpression exp1, LaplaceExpression exp2, LaplaceExpression exp3)
        {
            Expressions.Add(exp1);
            Expressions.Add(exp2);
            Expressions.Add(exp3);
        }

        public LaplaceSum(LaplaceExpression exp1, LaplaceExpression exp2, LaplaceExpression exp3, LaplaceExpression exp4)
        {
            Expressions.Add(exp1);
            Expressions.Add(exp2);
            Expressions.Add(exp3);
            Expressions.Add(exp4);
        }

        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            ComplexDecimal output = 0;
            foreach (var exp in Expressions)
                output += exp.Evaluate(point);

            return output;
        }
    }

    public class LaplacePower : LaplaceExpression
    {
        public LaplaceExpression ebase;
        public LaplaceExpression exp;

        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            return ComplexDecimal.Pow(ebase.Evaluate(point), exp.Evaluate(point));
        }
    }

    public class LaplaceQuotient : LaplaceExpression
    {
        public LaplaceExpression num;
        public LaplaceExpression denom;

        public override ComplexDecimal Evaluate(ComplexDecimal point)
        {
            return num.Evaluate(point) / denom.Evaluate(point);
        }
    }

}
