using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class TransferFunctionParametersControl : UserControl
    {
        private TransferFunctionComponent SerializableTF { get; }
        private string oldElementName;

        public TransferFunctionParametersControl()
        {
            this.InitializeComponent();
        }

        public TransferFunctionParametersControl(TransferFunctionComponent tf)
        {
            this.InitializeComponent();

            SerializableTF = tf;

            tf.PropertyChanged += handleChangeOfControls;

            //crvCurveControl.functions.Add(tf.standardTf);
            handleChangeOfControls(null, null);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableTF.PropertyChanged -= handleChangeOfControls;
            
            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableTF.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            boxRIn.Value = SerializableTF.RIn;
            boxROut.Value = SerializableTF.ROut;

            cmbFunctionType.SelectionChanged -= FunctionTypeChanged;
            cmbFunctionType.SelectedIndex = SerializableTF.FunctionType;
            cmbFunctionType.SelectionChanged += FunctionTypeChanged;

            cmbStandardFunction.SelectionChanged -= StandardFunctionChanged;
            cmbStandardFunction.SelectedIndex = getIndexStandardFunction(SerializableTF.StandardFunction);
            cmbStandardFunction.SelectionChanged += StandardFunctionChanged;
            
            boxAo.Value = SerializableTF.Ao;
            boxFp.Value = SerializableTF.Fp;
            boxFz.Value = SerializableTF.Fz;
            boxQp.Value = SerializableTF.Qp;

            chkInvert.Checked -= checkedInvert;
            chkInvert.Unchecked -= uncheckedInvert;
            chkInvert.IsChecked = SerializableTF.Invert;
            chkInvert.Checked += checkedInvert;
            chkInvert.Unchecked += uncheckedInvert;

            chkReverse.Checked -= checkedReverse;
            chkReverse.Unchecked -= uncheckedReverse;
            chkReverse.IsChecked = SerializableTF.Reverse;
            chkReverse.Checked += checkedReverse;
            chkReverse.Unchecked += uncheckedReverse;


            handleStkFunctionType();

            SerializableTF.PropertyChanged += handleChangeOfControls;
        }

        private void handleStkFunctionType()
        {
            stkStandard.Visibility = Visibility.Collapsed;
            stkLaplace.Visibility = Visibility.Collapsed;
            stkCustom.Visibility = Visibility.Collapsed;

            switch (SerializableTF.FunctionType)
            {
                case 0: stkStandard.Visibility = Visibility.Visible; break;
                case 1: stkCustom.Visibility = Visibility.Visible; break;
                case 2: stkLaplace.Visibility = Visibility.Visible; break;
            }

        }

        private int getIndexStandardFunction(string stFnc)
        {
            ComboBoxItem item;

            for (int x = 0; x < cmbStandardFunction.Items.Count; x++)
            {
                item = (ComboBoxItem)cmbStandardFunction.Items[x];
                if ((string)item.Tag == stFnc) return x;
            }
            
            return 0;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }
        

        private void RInChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "RIn",
                OldValue = SerializableTF.RIn,
                NewValue = boxRIn.Value
            };

            executeCommand(command);
        }

        private void ROutChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "ROut",
                OldValue = SerializableTF.ROut,
                NewValue = boxROut.Value
            };

            executeCommand(command);
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableTF.ElementName;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void FunctionTypeChanged(object sender, SelectionChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "FunctionType",
                OldValue = SerializableTF.FunctionType,
                NewValue = cmbFunctionType.SelectedIndex
            };

            executeCommand(command);
        }

        private void StandardFunctionChanged(object sender, SelectionChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "StandardFunction",
                OldValue = SerializableTF.StandardFunction,
                NewValue = (string)((ComboBoxItem)cmbStandardFunction.SelectedItem).Tag
            };

            executeCommand(command);
        }

        private void AoChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Ao",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void FpChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Fp",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void FzChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Fz",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void QpChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Qp",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }
        
        private void uncheckedInvert(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Invert",
                OldValue = SerializableTF.Invert,
                NewValue = false
            };

            executeCommand(command);
        }

        private void checkedInvert(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Invert",
                OldValue = SerializableTF.Invert,
                NewValue = true
            };

            executeCommand(command);
        }

        private void uncheckedReverse(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Reverse",
                OldValue = SerializableTF.Reverse,
                NewValue = false
            };

            executeCommand(command);
        }

        private void checkedReverse(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTF,
                Property = "Reverse",
                OldValue = SerializableTF.Reverse,
                NewValue = true
            };

            executeCommand(command);
        }
    }
}
